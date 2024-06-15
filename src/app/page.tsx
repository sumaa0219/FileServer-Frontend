'use client';

import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useRouter, usePathname } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { FaFile, FaFolder } from 'react-icons/fa';
import Modal from 'react-modal';

interface DirectoryItem {
  name: string;
  type: string;
  date: string;
  time: string;
  size?: string;
}

const Home = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [deleteModalIsOpen, setDeleteModalIsOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: { percent: number, speed: string } }>({});
  const router = useRouter();
  const pathname = usePathname();
  const baseURL = 'https://sssumaa.com/drive';
  const dir = pathname;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
  }, []);

  useEffect(() => {
    const fetchDirectories = async () => {
      const url = `${baseURL}/list${dir}`;
      console.log('Fetching directories from:', url);
      try {
        const response = await axios.get(url);
        const data = response.data;
        const directoriesArray: DirectoryItem[] = Object.keys(data).map(key => ({
          name: data[key].name,
          type: data[key].type,
          date: data[key].date,
          time: data[key].time,
          size: data[key].size,
        }));
        setDirectories(directoriesArray);
        console.log('Directories:', directoriesArray);
      } catch (error) {
        console.error('Failed to fetch directories:', error);
      }
    };

    fetchDirectories();
  }, [dir]);

  const handleUpload = async () => {
    const startTime = Date.now();
    const uploadPromises = files.map(file => {
      const formData = new FormData();
      formData.append('file', file);
      console.log(`${baseURL}/upload${dir}`);

      return axios.post(`${baseURL}/upload${dir}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            const elapsedTime = (Date.now() - startTime) / 1000; // seconds
            const uploadSpeed = (progressEvent.loaded / elapsedTime / 1024).toFixed(2); // KB/s
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: { percent: percentCompleted, speed: `${uploadSpeed} KB/s` }
            }));
          }
        }
      }).catch(error => {
        console.error(error);
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { percent: 0, speed: 'Error' }
        }));
        alert(`Failed to upload file: ${file.name}`);
      });
    });

    await Promise.all(uploadPromises);
    setUploadProgress({});
    window.location.reload(); // ファイルをアップロードした後にページをリロード
  };

  const handleDownload = async (fileName: string) => {
    const response = await axios.get(`${baseURL}/download${dir}/${fileName}`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
  };

  const handlePreview = (fileName: string) => {
    window.open(`${baseURL}/download${dir}/${fileName}?type=inline`);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await axios.delete(`${baseURL}/delete${dir}/${itemToDelete}`);
      setItemToDelete(null);
      setDeleteModalIsOpen(false);
      // ディレクトリ一覧を再取得
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('Failed to delete item');
    }
  };

  const handleCreateFolder = async () => {
    try {
      await axios.post(`${baseURL}/create${dir}/${newFolderName}`);
      setModalIsOpen(false);
      setNewFolderName('');
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('Failed to create folder');
    }
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  const handleDirectoryClick = (directoryName: string) => {
    const newDir = `${dir}/${directoryName}`;
    console.log('Navigating to:', newDir);
    router.push(newDir);
  };

  const renderBreadcrumbs = () => {
    const parts = pathname.split('/').filter(Boolean);
    const paths = parts.map((part, index) => ({
      name: part,
      path: `/${parts.slice(0, index + 1).join('/')}`
    }));

    return (
      <nav className="mb-4">
        <span key="root">
          <a
            href="#"
            onClick={() => router.push("/")}
            className="text-blue-500 hover:underline"
          >
            {decodeURIComponent("ホーム")}
          </a>
          <span className="mx-2">/</span>
        </span>
        {paths.map((p, index) => (
          <span key={p.path}>
            <a
              href="#"
              onClick={() => router.push(p.path)}
              className="text-blue-500 hover:underline"
            >
              {decodeURIComponent(p.name)}
            </a>
            {index < paths.length - 1 && <span className="mx-2">/</span>}
          </span>
        ))}
      </nav>
    );
  };

  return (
    <div className="p-8">
      <div {...getRootProps()} className="border-4 border-dashed border-gray-300 p-8 mb-4 rounded-lg flex justify-center items-center flex-col cursor-pointer">
        <input {...getInputProps()} className="hidden" />
        <p className="text-gray-600">Drag & drop files here, or click to select files</p>
      </div>
      <div className="w-full mb-4">
        {files.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Files to be uploaded:</h3>
            <ul className="list-disc pl-5">
              {files.map((file, index) => (
                <li key={index}>
                  {file.name} - {uploadProgress[file.name] ? `${uploadProgress[file.name].percent}% (${uploadProgress[file.name].speed})` : 'Not started'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div>
        <button onClick={handleUpload} className="bg-blue-500 text-white px-4 py-2 rounded-lg mb-4 hover:bg-blue-600">Upload</button>
        <div className="flex justify-end">
          <button onClick={() => setModalIsOpen(true)} className="bg-blue-500 text-white px-4 py-2 rounded-lg mb-4 hover:bg-blue-600">Create Folder</button>
        </div>
      </div>
      {renderBreadcrumbs()}
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b border-gray-200 bg-gray-50">名前</th>
              <th className="py-2 px-4 border-b border-gray-200 bg-gray-50">追加日</th>
              <th className="py-2 px-4 border-b border-gray-200 bg-gray-50">ファイルサイズ</th>
              <th className="py-2 px-4 border-b border-gray-50">アクション</th>
            </tr>
          </thead>
          <tbody>
            {directories.map((item) => (
              <tr key={item.name} className="hover:bg-gray-100">
                <td className="py-2 px-4 border-b border-gray-200 flex items-center space-x-2">
                  {item.type === 'file' ? <FaFile className="text-gray-500" /> : <FaFolder className="text-yellow-500" />}
                  {item.type === 'dir' ? (
                    <a
                      href="#"
                      onClick={() => handleDirectoryClick(item.name)}
                      className="text-blue-500 font-semibold flex items-center space-x-2"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <a
                      href="#"
                      onClick={() => handlePreview(item.name)}
                      className="text-blue-500 font-semibold flex items-center space-x-2"
                    >
                      {item.name}
                    </a>
                  )}
                </td>
                <td className="py-2 px-4 border-b border-gray-200">
                  {item.date} {item.time}
                </td>
                <td className="py-2 px-4 border-b border-gray-200">{item.size ? `${item.size}` : '-'}</td>
                <td className="py-2 px-4 border-b border-gray-200 flex space-x-2">
                  {item.type === 'file' && (
                    <>
                      <button onClick={() => handleDownload(item.name)} className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600">Download</button>
                    </>
                  )}
                  <button onClick={() => {
                    setItemToDelete(item.name);
                    setDeleteModalIsOpen(true);
                  }} className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        contentLabel="Create Folder"
        className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50"
      >
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <h2 className="text-xl mb-4">Create New Folder</h2>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder Name"
            className="border p-2 mb-4 w-full"
          />
          <div className="flex justify-end space-x-2">
            <button onClick={() => setModalIsOpen(false)} className="bg-gray-500 text-white px-4 py-2 rounded-lg">Cancel</button>
            <button onClick={handleCreateFolder} className="bg-blue-500 text-white px-4 py-2 rounded-lg">Create</button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={deleteModalIsOpen}
        onRequestClose={() => setDeleteModalIsOpen(false)}
        contentLabel="Confirm Delete"
        className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50"
      >
        <div className="bg-white p-4 rounded-lg shadow-lg">
          <h2 className="text-xl mb-4">Confirm Delete</h2>
          <p>Are you sure you want to delete <strong>{itemToDelete}</strong>?</p>
          <div className="flex justify-end space-x-2 mt-4">
            <button onClick={() => setDeleteModalIsOpen(false)} className="bg-gray-500 text-white px-4 py-2 rounded-lg">Cancel</button>
            <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded-lg">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Home;
