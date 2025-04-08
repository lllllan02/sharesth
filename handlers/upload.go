package handlers

import (
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"

	"sharesth/models"
	"sharesth/utils"
)

// UploadHandler 处理上传内容
func UploadHandler(c *gin.Context) {
	// 获取客户端标识
	clientIdentifier := utils.GetClientIdentifier(c.Request)

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
			Source:     clientIdentifier,
			CreateTime: time.Now(),
			Title:      title,
		}

		// 保存内容到数据库
		if err := models.SaveContent(shortID, content); err != nil {
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

		// 使用优化的文件保存函数
		filename, err := utils.SaveUploadedImage(file, fileHeader.Filename)
		if err != nil {
			log.Printf("保存图片失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("图片保存失败: %v", err)})
			return
		}

		// 生成默认标题（如果没有提供）
		if title == "" {
			title = "图片: " + filepath.Base(fileHeader.Filename)
		}

		// 生成短链接
		shortID := utils.GenerateShortID(6)
		content := models.Content{
			Type:       "image",
			Data:       filename,
			Source:     clientIdentifier,
			CreateTime: time.Now(),
			Title:      title,
		}

		// 保存内容到数据库
		if err := models.SaveContent(shortID, content); err != nil {
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
