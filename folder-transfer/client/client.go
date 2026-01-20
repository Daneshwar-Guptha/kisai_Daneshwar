package main

import (
	"context"
	"io"
	"log"
	"os"
	"path/filepath"

	pb "folder-transfer/proto"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

const (
	DOWNLOAD_DIR = "/mnt/c/Users/kdaneshwar/Documents/random_filesgb"
)

func collectProgress(base string) []*pb.FileProgress {
	var list []*pb.FileProgress

	filepath.Walk(base, func(path string, info os.FileInfo, err error) error {
		if err == nil && !info.IsDir() {
			rel, _ := filepath.Rel(base, path)
			list = append(list, &pb.FileProgress{
				FilePath: rel,
				Offset:   info.Size(),
			})
		}
		return nil
	})
	return list
}

func main() {
	os.MkdirAll(DOWNLOAD_DIR, 0755)

	log.Println("CLIENT Connecting to server")

	conn, err := grpc.NewClient("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close()

	client := pb.NewFileTransferServiceClient(conn)

	progress := collectProgress(DOWNLOAD_DIR)

	stream, err := client.DownloadFolder(context.Background(), &pb.FolderRequest{
		FolderPath: "/mnt/c/Users/kdaneshwar/Documents/random_files1gb",
		Progress:   progress,
	})
	if err != nil {
		log.Fatal(err)
	}

	openFiles := make(map[string]*os.File)
	chunkCounter := make(map[string]int)

	for {
		chunk, err := stream.Recv()
		if err == io.EOF {
			log.Println("CLIENT Download completed")
			return
		}
		if err != nil {
			log.Fatal("CLIENT Server disconnected")
		}

		outPath := filepath.Join(DOWNLOAD_DIR, chunk.FilePath)
		os.MkdirAll(filepath.Dir(outPath), 0755)

		f, ok := openFiles[outPath]
		if !ok {
			f, _ = os.OpenFile(outPath, os.O_CREATE|os.O_WRONLY, 0644)
			openFiles[outPath] = f
			chunkCounter[outPath] = 0
			log.Printf("CLIENT Started file: %s\n", chunk.FilePath)
		}

		if len(chunk.Data) > 0 {
			chunkCounter[outPath]++
			f.WriteAt(chunk.Data, chunk.Offset)

			log.Printf(
				"CLIENT File=%s Chunk=%d Offset=%d\n",
				chunk.FilePath,
				chunkCounter[outPath],
				chunk.Offset,
			)
		}

		if chunk.Eof {
			f.Close()
			delete(openFiles, outPath)
			log.Printf("CLIENT Finished file: %s\n", chunk.FilePath)
		}
	}
}
