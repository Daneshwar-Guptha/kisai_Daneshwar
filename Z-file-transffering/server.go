package main

import (
	"fmt"
	"io"
	"log"
	"net"
	"os"

	pb "github.com/kdaneshwar/z-file-transferring/proto"
	"google.golang.org/grpc"
)

type server struct {
	pb.UnimplementedFileTransferServiceServer
}

func (s *server) DownloadFile(
	req *pb.FileRequest,
	stream pb.FileTransferService_DownloadFileServer,
) error {

	filePath := "C:/Users/K Daneshwar guptha/OneDrive/Desktop/JavaScript/Day2/practice.java"

	
	data, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Println("File not found:", filePath)
		return err
	}
	fmt.Println("File content:\n", string(data)) 


	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	
	if req.Offset > 0 {
		_, err = file.Seek(req.Offset, io.SeekStart)
		if err != nil {
			return err
		}
	}


	buffer := make([]byte, 64*1024)
	for {
		n, err := file.Read(buffer)

		if n > 0 {
			if err := stream.Send(&pb.FileChunk{
				Data: buffer[:n],
				Eof:  false,
			}); err != nil {
				return err
			}
		}

		if err == io.EOF {
			stream.Send(&pb.FileChunk{Eof: true})
			break
		}
		if err != nil {
			return err
		}
	}

	return nil
}

func main() {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatal(err)
	}

	grpcServer := grpc.NewServer()
	pb.RegisterFileTransferServiceServer(grpcServer, &server{})

	fmt.Println("Server running on :50051")
	log.Fatal(grpcServer.Serve(lis))
}
