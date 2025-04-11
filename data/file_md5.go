package data

import (
	"sharesth/models"
)

// FindFileMD5 查找指定MD5哈希对应的文件路径
func FindFileMD5(md5Hash string) (string, bool) {
	var fileMD5 models.FileMD5
	result := DB.Where("md5_hash = ?", md5Hash).First(&fileMD5)
	if result.Error != nil {
		return "", false
	}

	return fileMD5.FilePath, true
}

// SaveFileMD5 保存MD5哈希与文件路径的映射
func SaveFileMD5(md5Hash string, filePath string) error {
	fileMD5 := models.FileMD5{
		MD5Hash:  md5Hash,
		FilePath: filePath,
	}

	return DB.Create(&fileMD5).Error
}

// DeleteFileMD5 删除指定MD5哈希的记录
func DeleteFileMD5(md5Hash string) error {
	return DB.Where("md5_hash = ?", md5Hash).Delete(&models.FileMD5{}).Error
}
