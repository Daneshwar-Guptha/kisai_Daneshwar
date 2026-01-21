import os
import grpc
from proto import fileTransfer_pb2
from proto import fileTransfer_pb2_grpc


SERVER_ADDRESS = "10.18.226.157:50051"


DOWNLOAD_DIR = "/mnt/c/Users/kdaneshwar/Documents/random_file_1gb_file"


SERVER_FOLDER = "/mnt/c/Users/kdaneshwar/Documents/random_files1gb"

CHUNK_SIZE = 3 * 1024 * 1024


os.makedirs(DOWNLOAD_DIR, exist_ok=True)


def collect_progress(base_dir):
   
    progress_list = []

    for root, dirs, files in os.walk(base_dir):
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, base_dir)

            progress_list.append(
                fileTransfer_pb2.FileProgress(
                    file_path=rel_path,
                    offset=os.path.getsize(full_path)
                )
            )

    return progress_list


def main():
    channel = grpc.insecure_channel(SERVER_ADDRESS)
    client = fileTransfer_pb2_grpc.FileTransferServiceStub(channel)

    progress = collect_progress(DOWNLOAD_DIR)

   
    request = fileTransfer_pb2.FolderRequest(
        folder_path=SERVER_FOLDER,
        progress=progress
    )

    open_files = {}
    chunk_counter = {}

    try:
        stream = client.DownloadFolder(request)

        for chunk in stream:
            if not chunk.file_path:
                continue

            out_path = os.path.join(DOWNLOAD_DIR, chunk.file_path)
            os.makedirs(os.path.dirname(out_path), exist_ok=True)

            if out_path not in open_files:
                mode = "r+b" if os.path.exists(out_path) else "wb"
                f = open(out_path, mode)
                open_files[out_path] = f
                chunk_counter[out_path] = 0
                print(f"[CLIENT] Started file: {chunk.file_path}")

            f = open_files[out_path]

            if chunk.data:
                f.seek(chunk.offset)
                f.write(chunk.data)
                chunk_counter[out_path] += 1
                print(
                    f"[CLIENT] File={chunk.file_path} "
                    f"Chunk={chunk_counter[out_path]} "
                    f"Offset={chunk.offset} "
                    f"Size={len(chunk.data)}"
                )

            if chunk.eof:
                f.close()
                del open_files[out_path]
                print(f"[CLIENT] Finished file: {chunk.file_path}")

    except grpc.RpcError as e:
        print(f"[CLIENT] gRPC Error: {e}")

    finally:
        for f in open_files.values():
            f.close()


if __name__ == "__main__":
    main()
