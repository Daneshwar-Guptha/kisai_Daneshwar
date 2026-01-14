package main

import (
	"context"
	"fmt"
	pb "grpc-go/proto"
	"io"
	"log"
	"net"
	"os"

	"google.golang.org/grpc"
)

type server struct{
	pb.UnimplementedMessageServiceServer
  
}

func (s * server) SayHello(ctx context.Context, in *pb.RequestMessage )(*pb.ResponseMessage,error){
	fmt.Println("Client connected:", in.GetName())

	// Respond to the client
	return &pb.ResponseMessage{
		Message: "Hi " + in.GetName() + ", I am Guptha",
	}, nil
}


func main(){
	file,error  := os.Open("./proto//message.proto")
	data,error := io.ReadAll(file)
	fmt.Println(string(data))
	if error!=nil{
		log.Fatal(error)
	}
	fmt.Println(file)


	
	port:=":50051"
	lis,err := net.Listen("tcp",port)
	if err!= nil{
		fmt.Println(err)
	}
	grpcServer := grpc.NewServer();
	pb.RegisterMessageServiceServer(grpcServer,&server{})

	fmt.Println(lis.Addr());
	if err := grpcServer.Serve(lis); err != nil {
    log.Fatal(err)
}
}