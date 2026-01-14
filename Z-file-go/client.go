package main

import (
	"context"
	"fmt"
	"log"
	

	pb "grpc-go/proto"         
	"google.golang.org/grpc"   
)


func sayHello(name string) {
	
	conn, err := grpc.Dial("localhost:50051", grpc.WithInsecure())
	if err != nil {
		log.Fatalf("Failed to connect to server: %v", err)
	}
	
	defer conn.Close()

	
	client := pb.NewMessageServiceClient(conn)

	
	request := &pb.RequestMessage{
		Name: name,
	}

	
	

	
	response, err := client.SayHello(context.Background(), request)
	if err != nil {
		log.Fatalf("Error calling SayHello: %v", err)
	}

	
	fmt.Println("Server response:", response.Message)
}


	func main() {
		var message string

		fmt.Scan(&message)
	
	   sayHello(message)
}
