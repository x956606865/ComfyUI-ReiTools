/**
 * 文件选择器工具函数
 * 提供简单易用的API来打开文件选择器弹框
 */
interface FileSelectOptions {
    mode?: 'file' | 'directory' | 'both';
    title?: string;
    allowedExtensions?: string[];
    initialPath?: string;
    baseDir?: string;
}
interface FileSelectResult {
    path: string;
    type: 'file' | 'directory';
    name: string;
}
/**
 * 获取ComfyUI文件系统数据
 */
export declare function fetchFileSystemData(path?: string, showFiles?: boolean): Promise<any>;
/**
 * 创建文件选择器Promise
 * 返回一个Promise，用户选择文件后resolve，取消时reject
 */
export declare function createFileSelector(options?: FileSelectOptions): Promise<FileSelectResult>;
/**
 * 简化的文件选择函数
 */
export declare function selectFile(allowedExtensions?: string[]): Promise<FileSelectResult>;
/**
 * 简化的文件夹选择函数
 */
export declare function selectDirectory(baseDir?: string): Promise<FileSelectResult>;
/**
 * 选择模型文件夹 (从models目录开始)
 */
export declare function selectModelDirectory(): Promise<FileSelectResult>;
/**
 * 选择Lora文件夹 (从models目录开始)
 */
export declare function selectLoraDirectory(): Promise<FileSelectResult>;
/**
 * 选择图片文件
 */
export declare function selectImage(): Promise<FileSelectResult>;
/**
 * 选择文本文件
 */
export declare function selectTextFile(): Promise<FileSelectResult>;
/**
 * 选择Python文件
 */
export declare function selectPythonFile(): Promise<FileSelectResult>;
export declare const FileSelector: {
    create: typeof createFileSelector;
    selectFile: typeof selectFile;
    selectDirectory: typeof selectDirectory;
    selectModelDirectory: typeof selectModelDirectory;
    selectLoraDirectory: typeof selectLoraDirectory;
    selectImage: typeof selectImage;
    selectTextFile: typeof selectTextFile;
    selectPythonFile: typeof selectPythonFile;
    fetchFileSystemData: typeof fetchFileSystemData;
};
export default FileSelector;
