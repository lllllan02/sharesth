package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"sharesth/data"
	"sharesth/models"
	"sharesth/utils"
)

// handleTextContent 处理文本和Markdown内容
func handleTextContent(c *gin.Context, contentType, clientIdentifier, title string, isPublic bool) (models.Content, error) {
	// 获取内容
	contentData := c.PostForm("content")
	if contentData == "" {
		return models.Content{}, fmt.Errorf("未提供内容")
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

	// 设置当前时间
	currentTime := time.Now()

	content := models.Content{
		Type:       contentType,
		Data:       contentData,
		Source:     clientIdentifier,
		CreateTime: currentTime,
		UpdateTime: currentTime,
		Title:      title,
		IsPublic:   isPublic,
	}

	return content, nil
}

// handleImageContent 处理图片内容
func handleImageContent(c *gin.Context, clientIdentifier, title string, isPublic bool) (models.Content, error) {
	// 获取上传的图片文件
	file, err := c.FormFile("file")
	if err != nil {
		return models.Content{}, fmt.Errorf("无法获取上传的图片: %v", err)
	}

	// 检查是否是图片类型
	if !strings.HasPrefix(file.Header.Get("Content-Type"), "image/") {
		return models.Content{}, fmt.Errorf("上传的文件不是图片")
	}

	// 打开上传的文件
	src, err := file.Open()
	if err != nil {
		return models.Content{}, fmt.Errorf("打开上传文件失败: %v", err)
	}
	defer src.Close()

	// 使用SaveUploadedImage保存文件并实现去重
	filepath, err := data.SaveUploadedImage(src, file.Filename)
	if err != nil {
		return models.Content{}, fmt.Errorf("保存图片失败: %v", err)
	}

	// 使用文件名作为默认标题（如果没有提供）
	if title == "" {
		title = "图片: " + file.Filename
	}

	// 设置当前时间
	currentTime := time.Now()

	content := models.Content{
		Type:       "image",
		Data:       filepath, // 保存图片路径
		Source:     clientIdentifier,
		CreateTime: currentTime,
		UpdateTime: currentTime,
		Title:      title,
		IsPublic:   isPublic,
	}

	return content, nil
}

// ShareHandler 处理内容分享
func ShareHandler(c *gin.Context) {
	// 获取客户端标识
	clientIdentifier := data.GetClientIdentifier(c.Request)

	// 获取内容类型
	contentType := c.PostForm("type")
	if contentType == "" {
		// 默认为markdown以兼容旧版本
		contentType = "markdown"
	}

	// 记录上传类型
	log.Printf("接收到分享请求，内容类型: %s, 客户端ID: %s", contentType, clientIdentifier)

	// 验证内容类型是否有效
	if contentType != "markdown" && contentType != "text" && contentType != "image" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的内容类型"})
		return
	}

	// 获取标题（如果没有提供，则使用默认标题）
	title := c.PostForm("title")
	log.Printf("分享标题: %s", title)

	// 获取公开设置参数
	isPublic := c.PostForm("is_public") == "true"
	log.Printf("内容公开设置: %v", isPublic)

	var (
		content models.Content
		err     error
	)

	// 根据内容类型处理不同的上传
	switch contentType {
	case "markdown", "text":
		content, err = handleTextContent(c, contentType, clientIdentifier, title, isPublic)
	case "image":
		content, err = handleImageContent(c, clientIdentifier, title, isPublic)
	}

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 生成短链接ID并保存内容
	shortID := utils.GenerateShortID(8)

	// 保存内容到数据库
	if err := data.SaveContent(shortID, content); err != nil {
		log.Printf("保存内容失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "保存内容失败"})
		return
	}

	// 返回短链接
	c.JSON(http.StatusOK, gin.H{
		"shortLink": fmt.Sprintf("http://%s/%s", c.Request.Host, shortID),
	})
}
