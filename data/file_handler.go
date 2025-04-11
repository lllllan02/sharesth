package data

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"sharesth/utils"
)

// SaveUploadedImage 保存上传的图片并返回唯一的文件路径
// 如果发现相同内容的文件已存在，则直接返回已存在的文件路径
func SaveUploadedImage(file io.Reader, originalFilename string) (string, error) {
	// 确保上传目录存在
	if _, err := os.Stat(utils.UploadsDir); os.IsNotExist(err) {
		if err := os.MkdirAll(utils.UploadsDir, 0755); err != nil {
			return "", fmt.Errorf("创建上传目录失败: %v", err)
		}
	}

	// 计算文件内容的MD5
	tempFile, err := os.CreateTemp("", "upload-*")
	if err != nil {
		return "", fmt.Errorf("创建临时文件失败: %v", err)
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	// 将上传内容写入临时文件，同时计算MD5
	hash := md5.New()
	multiWriter := io.MultiWriter(tempFile, hash)

	if _, err := io.Copy(multiWriter, file); err != nil {
		return "", fmt.Errorf("复制文件内容失败: %v", err)
	}

	// 获取文件MD5和扩展名
	contentMD5 := hex.EncodeToString(hash.Sum(nil))
	fileExt := filepath.Ext(originalFilename)
	if fileExt == "" {
		// 如果没有扩展名，默认为.jpg
		fileExt = ".jpg"
	}

	// 检查是否已存在相同MD5的文件
	existingFile, found := FindFileMD5(contentMD5)
	if found {
		// 验证文件是否真的存在
		if _, err := os.Stat(existingFile); err == nil {
			log.Printf("找到重复文件: %s (MD5: %s)", existingFile, contentMD5)
			return existingFile, nil
		}
		// 如果文件不存在，从索引中删除并继续处理
		DeleteFileMD5(contentMD5)
		log.Printf("从MD5索引中删除不存在的文件: %s", contentMD5)
	}

	// 生成唯一文件名：当前时间戳_内容MD5哈希_原始文件名的一部分
	timestamp := time.Now().UnixNano() / 1000000 // 毫秒时间戳
	baseFilename := filepath.Base(originalFilename)
	// 如果原始文件名过长，截取前20个字符
	if len(baseFilename) > 20 {
		baseFilename = baseFilename[:20]
	}
	// 移除扩展名并转换为小写
	baseFilename = strings.ToLower(strings.TrimSuffix(baseFilename, filepath.Ext(baseFilename)))
	// 生成最终的文件名
	filename := fmt.Sprintf("%d_%s_%s%s", timestamp, contentMD5[:8], baseFilename, fileExt)
	// 生成文件路径
	filePath := filepath.Join(utils.UploadsDir, filename)

	// 将临时文件内容复制到最终文件
	tempFile.Seek(0, 0)
	finalFile, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("创建最终文件失败: %v", err)
	}
	defer finalFile.Close()

	if _, err := io.Copy(finalFile, tempFile); err != nil {
		os.Remove(filePath) // 失败时清理
		return "", fmt.Errorf("写入最终文件失败: %v", err)
	}

	// 记录MD5与文件路径的对应关系
	if err := SaveFileMD5(contentMD5, filePath); err != nil {
		log.Printf("保存MD5索引失败（非致命）: %v", err)
	}

	log.Printf("保存新文件: %s (MD5: %s)", filePath, contentMD5)
	return filePath, nil
}
