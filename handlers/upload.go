package handlers

import (
	"net/http"
	"path/filepath"
	"sharesth/data"
	"strings"

	"github.com/gin-gonic/gin"
)

// UploadImageForMD 处理 Markdown 编辑器的图片上传
func UploadImageForMD(c *gin.Context) {
	// 获取上传的文件
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "获取上传文件失败: " + err.Error(),
		})
		return
	}

	// 验证文件是否为图片（简单验证文件扩展名）
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true}
	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "只允许上传JPG、PNG或GIF图片",
		})
		return
	}

	// 打开上传的文件
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "打开上传文件失败: " + err.Error(),
		})
		return
	}
	defer src.Close()

	// 使用SaveUploadedImage保存文件并实现去重
	filepath, err := data.SaveUploadedImage(src, file.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "保存文件失败: " + err.Error(),
		})
		return
	}

	// 构建访问URL并返回
	imageURL := "/" + filepath // URL 是相对于网站根目录的
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"file": gin.H{
			"url": imageURL,
		},
	})
}
