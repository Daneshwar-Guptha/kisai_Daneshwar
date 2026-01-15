package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"time"

	pb "github.com/kdaneshwar/z-file-transferring/proto"
	"google.golang.org/grpc"
)

const (
	SERVER_ADDRESS = "192.168.0.229:50051"
)

func downloadFile(fileName string, outputFile string) error {
	offset := int64(0)
	if info, err := os.Stat(outputFile); err == nil {
		offset = info.Size()
		fmt.Printf("Resuming download from byte %d\n", offset)
	}

	conn, err := grpc.Dial(SERVER_ADDRESS, grpc.WithInsecure())
	if err != nil {
		return fmt.Errorf("failed to connect: %v", err)
	}
	defer conn.Close()

	client := pb.NewFileTransferServiceClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Hour)
	defer cancel()

	stream, err := client.DownloadFile(ctx, &pb.FileRequest{
		FileName: fileName,
		Offset:   offset,
	})
	if err != nil {
		return fmt.Errorf("failed to call DownloadFile: %v", err)
	}

	file, err := os.OpenFile(outputFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return fmt.Errorf("failed to open file: %v", err)
	}
	defer file.Close()

	for {
		chunk, err := stream.Recv()
		if err == io.EOF {
			fmt.Println("Download completed")
			break
		}
		if err != nil {
			return fmt.Errorf("error receiving chunk: %v", err)
		}

		if _, err := file.Write(chunk.Data); err != nil {
			return fmt.Errorf("error writing to file: %v", err)
		}

		if chunk.Eof {
			fmt.Println("Download successful")
			break
		}
	}

	return nil
}

func main() {
	fileName := "/mnt/c/Users/kdaneshwar/Documents/grpc-demo1/Demo/hello.proto"
	outputFile := "fileTransfer.txt"

	if err := downloadFile(fileName, outputFile); err != nil {
		log.Fatalf("Download failed: %v", err)
	}
}
