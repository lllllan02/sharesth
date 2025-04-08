package handlers

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"sharesth/models"
	"sharesth/utils"
)

// UploadHandler 处理上传内容
func UploadHandler(c *gin.Context) {
	// 获取客户端标识
	clientIdentifier := utils.GetClientIdentifier(c.Request)

	// 获取内容类型
	contentType := c.PostForm("type")
	if contentType == "" {
		// 默认为markdown以兼容旧版本
		contentType = "markdown"
	}

	// 记录上传类型
	log.Printf("接收到上传请求，内容类型: %s, 客户端ID: %s", contentType, clientIdentifier)

	// 验证内容类型是否有效
	if contentType != "markdown" && contentType != "text" && contentType != "image" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的内容类型"})
		return
	}

	// 获取标题（如果没有提供，则使用默认标题）
	title := c.PostForm("title")
	log.Printf("上传标题: %s", title)

	var content models.Content
	var contentData string

	// 根据内容类型处理不同的上传
	switch contentType {
	case "markdown", "text":
		// 获取内容 (适配旧版本，同时接受 'markdown' 和 'content' 参数)
		contentData = c.PostForm("content")
		if contentData == "" {
			contentData = c.PostForm("markdown") // 兼容旧版本
		}

		if contentData == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "未提供内容"})
			return
		}

		log.Printf("收到内容类型: %s, 内容长度: %d", contentType, len(contentData))

		// 生成默认标题（如果没有提供）
		if title == "" {
			if len(contentData) > 20 {
				title = contentData[:20] + "..."
			} else {
				title = contentData
			}
		}

		content = models.Content{
			Type:       contentType,
			Data:       contentData,
			Source:     clientIdentifier,
			CreateTime: time.Now(),
			Title:      title,
		}

	case "image":
		// 获取上传的图片文件
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无法获取上传的图片: " + err.Error()})
			return
		}

		// 检查是否是图片类型
		if !strings.HasPrefix(file.Header.Get("Content-Type"), "image/") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "上传的文件不是图片"})
			return
		}

		// 创建上传目录（如果不存在）
		uploadDir := filepath.Join("uploads", "images")
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建上传目录失败: " + err.Error()})
			return
		}

		// 生成唯一文件名
		filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), filepath.Base(file.Filename))
		filepath := filepath.Join(uploadDir, filename)

		// 保存文件
		if err := c.SaveUploadedFile(file, filepath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "保存图片失败: " + err.Error()})
			return
		}

		// 使用文件名作为默认标题（如果没有提供）
		if title == "" {
			title = "图片: " + file.Filename
		}

		content = models.Content{
			Type:       contentType,
			Data:       filepath, // 保存图片路径
			Source:     clientIdentifier,
			CreateTime: time.Now(),
			Title:      title,
		}
	}

	// 生成短链接
	shortID := utils.GenerateShortID(6)

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
}
