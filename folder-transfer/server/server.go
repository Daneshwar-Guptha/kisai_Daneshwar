package main

import (
	
	"io"
	"log"
	"os"
	"path/filepath"
	"time"

	pb "folder-transfer/proto"
	"google.golang.org/grpc"
	"net"
)

const CHUNK_SIZE = 3*1024 * 1024

type Server struct {
	pb.UnimplementedFileTransferServiceServer
}

func walkDir(base string, files *[]string) {
	filepath.Walk(base, func(path string, info os.FileInfo, err error) error {
		if err == nil && !info.IsDir() {
			*files = append(*files, path)
		}
		return nil
	})
}

func (s *Server) DownloadFolder(req *pb.FolderRequest, stream pb.FileTransferService_DownloadFolderServer) error {
	
	log.Println("[SERVER] Client connected")

	progress := make(map[string]int64)
	for _, p := range req.Progress {
		progress[p.FilePath] = p.Offset
	}

	var files []string
	walkDir(req.FolderPath, &files)

	for _, fullPath := range files {
		rel, _ := filepath.Rel(req.FolderPath, fullPath)

		file, err := os.Open(fullPath)
		if err != nil {
			continue
		}

		offset := progress[rel]
		file.Seek(offset, io.SeekStart)

		log.Printf("[SERVER] Sending file: %s (resume offset=%d)\n", rel, offset)

		buf := make([]byte, CHUNK_SIZE)
		chunkNo := 0

		for {
			n, err := file.Read(buf)
			if n > 0 {
				chunkNo++

				err = stream.Send(&pb.FileChunk{
					FilePath: rel,
					Offset:   offset,
					Data:     buf[:n],
					Eof:      false,
				})
				if err != nil {
					log.Println("[SERVER] Client disconnected during transfer")
					file.Close()
					return err
				}

				log.Printf("[SERVER] File=%s Chunk=%d Bytes=%d\n", rel, chunkNo, n)

				offset += int64(n)
				time.Sleep(50 * time.Millisecond)
			}

			if err == io.EOF {
				stream.Send(&pb.FileChunk{
					FilePath: rel,
					Offset:   offset,
					Data:     nil,
					Eof:      true,
				})
				log.Printf("[SERVER] Finished file: %s\n", rel)
				break
			}
			if err != nil {
				break
			}
		}
		file.Close()
	}

	log.Println("[SERVER] Client completed download")
	return nil
}

func main() {
	lis, _ := net.Listen("tcp", ":50051")
	grpcServer := grpc.NewServer()
	pb.RegisterFileTransferServiceServer(grpcServer, &Server{})
	log.Println("[SERVER] Running on :50051")
	grpcServer.Serve(lis)
}
