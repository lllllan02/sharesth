package utils

import (
	"encoding/json"
	"log"
	"os"
	"path/filepath"
	"sync"
)

const (
	// UploadsDir 上传文件保存目录
	UploadsDir = "uploads"
	// FileMD5IndexPath 文件MD5索引路径
	FileMD5IndexPath = "data/file_md5_index.json"
)

// FileMD5Store 文件MD5索引存储，用于保存文件MD5与路径的映射
type FileMD5Store struct {
	data map[string]string // MD5 -> 文件路径
	lock sync.RWMutex      // 读写锁
}

// 创建文件MD5索引实例
var fileMD5Store = &FileMD5Store{
	data: make(map[string]string),
}

// 初始化文件MD5索引
func init() {
	loadFileMD5Index()
}

// loadFileMD5Index 加载文件MD5索引
func loadFileMD5Index() {
	fileMD5Store.lock.Lock()
	defer fileMD5Store.lock.Unlock()

	// 检查索引文件是否存在
	if _, err := os.Stat(FileMD5IndexPath); os.IsNotExist(err) {
		// 确保目录存在
		dir := filepath.Dir(FileMD5IndexPath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Printf("创建索引目录失败: %v", err)
		}
		return
	}

	// 读取索引文件
	data, err := os.ReadFile(FileMD5IndexPath)
	if err != nil {
		log.Printf("读取文件MD5索引失败: %v", err)
		return
	}

	// 解析索引
	if err := json.Unmarshal(data, &fileMD5Store.data); err != nil {
		log.Printf("解析文件MD5索引失败: %v", err)
	}
}

// saveFileMD5Index 保存文件MD5索引
func saveFileMD5Index() {
	fileMD5Store.lock.RLock()
	// 序列化索引
	data, err := json.MarshalIndent(fileMD5Store.data, "", "  ")
	fileMD5Store.lock.RUnlock()

	if err != nil {
		log.Printf("序列化文件MD5索引失败: %v", err)
		return
	}

	// 确保目录存在
	dir := filepath.Dir(FileMD5IndexPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Printf("创建索引目录失败: %v", err)
		return
	}

	// 写入索引文件
	if err := os.WriteFile(FileMD5IndexPath, data, 0644); err != nil {
		log.Printf("保存文件MD5索引失败: %v", err)
	}
}

// Get 从文件MD5索引中获取文件路径
func (store *FileMD5Store) Get(md5Hash string) (string, bool) {
	store.lock.RLock()
	defer store.lock.RUnlock()
	path, exists := store.data[md5Hash]
	return path, exists
}

// Set 设置文件MD5和路径的映射
func (store *FileMD5Store) Set(md5Hash, filePath string) {
	store.lock.Lock()
	store.data[md5Hash] = filePath
	store.lock.Unlock()
	// 保存更新后的索引
	go saveFileMD5Index()
}

// Delete 从文件MD5索引中删除一个记录
func (store *FileMD5Store) Delete(md5Hash string) {
	store.lock.Lock()
	delete(store.data, md5Hash)
	store.lock.Unlock()
	// 保存更新后的索引
	go saveFileMD5Index()
}

// GetFileMD5Store 获取文件MD5索引实例
func GetFileMD5Store() *FileMD5Store {
	return fileMD5Store
}
