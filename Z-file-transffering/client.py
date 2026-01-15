import grpc
import os

from proto import file_transfer_pb2
from proto import file_transfer_pb2_grpc



SERVER_ADDRESS = "192.168.0.229:50051"
OUTPUT_FILE = "fileTransfer.txt"


def download_file(file_name):
   
    offset = 0
    if os.path.exists(OUTPUT_FILE):
        offset = os.path.getsize(OUTPUT_FILE)
        print("Resuming from byte:", offset)

   
    channel = grpc.insecure_channel(SERVER_ADDRESS)

   
    client = file_transfer_pb2_grpc.FileTransferServiceStub(channel)

   
    request = file_transfer_pb2.FileRequest(
        file_name=file_name,
        offset=offset
    )

  
    stream = client.DownloadFile(request)

   
    file = open(OUTPUT_FILE, "ab")

    try:
        for chunk in stream:
            if chunk.eof:
                print("Download completed")
                break

            file.write(chunk.data)
            print("Received chunk:", len(chunk.data), "bytes")

    except grpc.RpcError as e:
        print("Download failed:", e.details())

    finally:
        file.close()
        channel.close()


if __name__ == "__main__":
    download_file("practice.java")
