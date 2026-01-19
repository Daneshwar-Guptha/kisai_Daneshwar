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
	"google.golang.org/grpc/credentials/insecure"
)

const (
	SERVER_ADDRESS = "10.105.54.157:50051"
)

func downloadFile(fileName string, outputFile string,count int) error {
	
	offset := int64(0)
	if info, err := os.Stat(outputFile); err == nil {
		offset = info.Size()
		count= int(offset)/(3*1024*1024)
		fmt.Printf(" %d is downloaded  Resuming download from byte %d\n", count,offset)
		fmt.Println(offset/(3*1024*1024))
		count= int(offset)/(3*1024*1024)

	}

	conn, err := grpc.NewClient(SERVER_ADDRESS, grpc.WithTransportCredentials(insecure.NewCredentials()))
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
		count = count+1;
		 log.Println(count)
		if err == io.EOF {
			fmt.Println("Download completed")
			break
		}
		if err != nil {
		
			return fmt.Errorf("error receiving chunk: %v", err)
		}

		if _, err := file.Write(chunk.Data);
	

		
		err != nil {
			 log.Println(count)
			return fmt.Errorf("error writing to file: %v", err)
			
			
		}
       
       

		if chunk.Eof {
			fmt.Println("Download successful")
			fmt.Println("total chunks was downloaded",count)
			break
		}
	}

	return nil
}

func main() {
	fileName := "/mnt/c/Users/kdaneshwar/Documents/grpc-demo1/Demo/hello.proto"
	outputFile := "./files-2gb/file2.txt"
	count:=0

	if err := downloadFile(fileName, outputFile,count); err != nil {
		log.Fatalf("Download failed: %v", err)
	}
}
