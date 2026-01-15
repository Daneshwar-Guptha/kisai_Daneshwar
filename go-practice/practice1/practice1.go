package main

import (
	"fmt"
	"os"
)




func main() {

  data ,err := os.ReadFile("/mnt/c/Users/kdaneshwar/Downloads/grpc client/grpc client/src/chat.proto")
  if err!=nil{
	fmt.Println("error",err)

  }
  fmt.Print(string(data))

	
}


