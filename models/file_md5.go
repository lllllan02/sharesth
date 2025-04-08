package models

import (
	"fmt"
	"time"
)

// SaveFileMD5 保存文件MD5信息
func SaveFileMD5(md5Hash string, filePath string) error {
	fileMD5 := FileMD5{
		MD5Hash:   md5Hash,
		FilePath:  filePath,
		CreatedAt: time.Now(),
	}

	result := DB.Create(&fileMD5)
	if result.Error != nil {
		return fmt.Errorf("保存文件MD5信息失败: %v", result.Error)
	}

	return nil
}

// FindFileMD5 查找文件MD5对应的路径
func FindFileMD5(md5Hash string) (string, bool) {
	var fileMD5 FileMD5
	result := DB.Where("md5_hash = ?", md5Hash).First(&fileMD5)
	if result.Error != nil {
		return "", false
	}

	return fileMD5.FilePath, true
}

// DeleteFileMD5 删除文件MD5信息
func DeleteFileMD5(md5Hash string) error {
	result := DB.Where("md5_hash = ?", md5Hash).Delete(&FileMD5{})
	if result.Error != nil {
		return fmt.Errorf("删除MD5信息失败: %v", result.Error)
	}

	return nil
}
