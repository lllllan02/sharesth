package utils

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

	"sharesth/models"
)

// SaveUploadedImage 保存上传的图片并返回唯一的文件路径
// 如果发现相同内容的文件已存在，则直接返回已存在的文件路径
func SaveUploadedImage(file io.Reader, originalFilename string) (string, error) {
	// 确保上传目录存在
	if _, err := os.Stat(UploadsDir); os.IsNotExist(err) {
		if err := os.MkdirAll(UploadsDir, 0755); err != nil {
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
	existingFile, found := models.FindFileMD5(contentMD5)
	if found {
		// 验证文件是否真的存在
		if _, err := os.Stat(existingFile); err == nil {
			log.Printf("找到重复文件: %s (MD5: %s)", existingFile, contentMD5)
			return existingFile, nil
		}
		// 如果文件不存在，从索引中删除并继续处理
		models.DeleteFileMD5(contentMD5)
		log.Printf("从MD5索引中删除不存在的文件: %s", contentMD5)
	}

	// 生成唯一文件名：当前时间戳_内容MD5哈希_原始文件名的一部分
	timestamp := time.Now().UnixNano() / 1000000 // 毫秒时间戳
	baseFilename := filepath.Base(originalFilename)
	if len(baseFilename) > 20 {
		baseFilename = baseFilename[:20] // 限制原始文件名长度
	}
	safeFilename := strings.ReplaceAll(baseFilename, " ", "_") // 替换空格为下划线
	uniqueFilename := fmt.Sprintf("%d_%s_%s%s", timestamp, contentMD5[:8], safeFilename, fileExt)
	targetPath := filepath.Join(UploadsDir, uniqueFilename)

	// 将临时文件内容移到目标位置
	// 首先需要重置临时文件的读取位置
	if _, err := tempFile.Seek(0, 0); err != nil {
		return "", fmt.Errorf("重置临时文件位置失败: %v", err)
	}

	// 创建目标文件
	targetFile, err := os.Create(targetPath)
	if err != nil {
		return "", fmt.Errorf("创建目标文件失败: %v", err)
	}
	defer targetFile.Close()

	// 复制内容到目标文件
	if _, err := io.Copy(targetFile, tempFile); err != nil {
		return "", fmt.Errorf("复制到目标文件失败: %v", err)
	}

	// 保存MD5记录
	err = models.SaveFileMD5(contentMD5, targetPath)
	if err != nil {
		log.Printf("保存MD5记录失败: %v", err)
		// 继续执行，不要因为这个错误中断上传
	}

	log.Printf("成功保存文件: %s (MD5: %s)", targetPath, contentMD5)
	return targetPath, nil
}
