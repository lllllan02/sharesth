package handlers

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"

	"sharesth/models"
	"sharesth/utils"
)

// UploadHandler 处理上传内容
func UploadHandler(c *gin.Context) {
	// 获取客户端IP地址
	clientIP := utils.GetClientIP(c.Request)

	// 获取标题（如果没有提供，则使用默认标题）
	title := c.PostForm("title")

	// 检查是否有文本内容
	textContent := c.PostForm("text")
	if textContent != "" {
		// 生成默认标题（如果没有提供）
		if title == "" {
			if len(textContent) > 20 {
				title = textContent[:20] + "..."
			} else {
				title = textContent
			}
		}

		// 生成短链接
		shortID := utils.GenerateShortID(6)
		content := models.Content{
			Type:       "text",
			Data:       textContent,
			Source:     clientIP,
			CreateTime: time.Now(),
			Title:      title,
		}

		// 保存内容到文件
		if err := utils.SaveContent(shortID, content); err != nil {
			log.Printf("保存内容失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "保存内容失败"})
			return
		}

		// 返回短链接
		c.JSON(http.StatusOK, gin.H{
			"shortLink": fmt.Sprintf("http://%s/%s", c.Request.Host, shortID),
		})
		return
	}

	// 检查是否有图片上传
	file, fileHeader, err := c.Request.FormFile("image")
	if err == nil {
		defer file.Close()

		// 确保上传目录存在
		if _, err := os.Stat("uploads"); os.IsNotExist(err) {
			os.Mkdir("uploads", 0755)
		}

		// 创建文件
		filename := filepath.Join("uploads", fileHeader.Filename)
		dst, err := os.Create(filename)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "无法创建文件"})
			return
		}
		defer dst.Close()

		// 复制文件内容
		if _, err = io.Copy(dst, file); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "文件上传失败"})
			return
		}

		// 生成默认标题（如果没有提供）
		if title == "" {
			title = "图片: " + fileHeader.Filename
		}

		// 生成短链接
		shortID := utils.GenerateShortID(6)
		content := models.Content{
			Type:       "image",
			Data:       filename,
			Source:     clientIP,
			CreateTime: time.Now(),
			Title:      title,
		}

		// 保存内容到文件
		if err := utils.SaveContent(shortID, content); err != nil {
			log.Printf("保存内容失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "保存内容失败"})
			return
		}

		// 返回短链接
		c.JSON(http.StatusOK, gin.H{
			"shortLink": fmt.Sprintf("http://%s/%s", c.Request.Host, shortID),
		})
		return
	}

	c.JSON(http.StatusBadRequest, gin.H{"error": "未提供文本内容或图片"})
}
