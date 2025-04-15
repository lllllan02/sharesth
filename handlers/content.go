package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"sharesth/data"
)

// MyContentPageHandler 显示当前用户内容页面
func MyContentPageHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "my_content.html", nil)
}

// MyContentAPIHandler 返回当前用户内容的JSON数据
func MyContentAPIHandler(c *gin.Context) {
	// 获取客户端标识
	clientIdentifier := data.GetClientIdentifier(c.Request)

	// 获取分页参数
	page := 1
	if pageParam := c.Query("page"); pageParam != "" {
		if p, err := strconv.Atoi(pageParam); err == nil && p > 0 {
			page = p
		}
	}

	perPage := 10
	if perPageParam := c.Query("per_page"); perPageParam != "" {
		if pp, err := strconv.Atoi(perPageParam); err == nil && pp > 0 {
			perPage = pp
		}
	}

	// 获取搜索参数
	query := c.Query("query")

	// 获取类型筛选参数
	typeFilter := c.Query("type")

	// 获取总记录数、分页数据和类型统计
	total, results, typeCounts := data.FindContentsBySourcePaginated(clientIdentifier, query, typeFilter, page, perPage)

	// 返回JSON结果
	c.JSON(http.StatusOK, gin.H{
		"source":     clientIdentifier,
		"total":      total,
		"page":       page,
		"per_page":   perPage,
		"items":      results,
		"typeCounts": typeCounts,
	})
}

// ToggleContentVisibilityHandler 切换内容的公开/隐藏状态
func ToggleContentVisibilityHandler(c *gin.Context) {
	// 获取客户端标识
	clientIdentifier := data.GetClientIdentifier(c.Request)

	// 获取内容ID
	contentID := c.PostForm("content_id")
	if contentID == "" {
		// 尝试从URL参数获取
		contentID = c.Query("content_id")
		if contentID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "未提供内容ID"})
			return
		}
	}

	// 获取当前用户拥有的内容
	content, err := data.LoadContentBySource(contentID, clientIdentifier)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "内容不存在或您无权修改"})
		return
	}

	// 切换公开状态
	content.IsPublic = !content.IsPublic

	// 保存更改
	err = data.UpdateContent(&content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新内容状态失败"})
		return
	}

	// 返回成功信息
	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"is_public": content.IsPublic,
		"message": fmt.Sprintf("内容已设为%s", func() string {
			if content.IsPublic {
				return "公开"
			}
			return "不公开"
		}()),
	})
}

// DeleteContentHandler 处理删除内容的请求
func DeleteContentHandler(c *gin.Context) {
	// 获取客户端标识
	clientIdentifier := data.GetClientIdentifier(c.Request)

	// 获取内容ID
	contentID := c.PostForm("content_id")
	if contentID == "" {
		// 尝试从URL参数获取
		contentID = c.Query("content_id")
		if contentID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "未提供内容ID"})
			return
		}
	}

	// 删除内容
	err := data.DeleteContent(contentID, clientIdentifier)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	// 返回成功信息
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "内容已成功删除",
	})
}

// ContentDetailHandler 处理获取内容详情的请求
func ContentDetailHandler(c *gin.Context) {
	// 获取客户端标识
	clientIdentifier := data.GetClientIdentifier(c.Request)

	// 获取内容ID
	contentID := c.Query("content_id")
	if contentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "未提供内容ID"})
		return
	}

	// 判断是否需要包含完整内容
	includeContent := c.Query("include_content") == "true"

	// 加载内容
	content, err := data.LoadContentBySource(contentID, clientIdentifier)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "找不到内容或您无权访问"})
		return
	}

	// 构建返回结果
	result := map[string]interface{}{
		"id":         content.ID,
		"short_id":   content.ShortID,
		"type":       content.Type,
		"createTime": content.CreateTime,
		"title":      content.Title,
		"is_public":  content.IsPublic,
	}

	// 根据内容类型和是否需要完整内容来添加字段
	if includeContent {
		result["content"] = content.Data

		// 添加内容摘要
		if content.Type == "markdown" || content.Type == "text" {
			if len(content.Data) > 200 {
				result["summary"] = content.Data[:200] + "..."
			} else {
				result["summary"] = content.Data
			}
		} else if content.Type == "image" {
			result["thumbnail_url"] = content.Data
			result["image_url"] = content.Data
			result["content_url"] = content.Data
		}
	} else {
		// 只返回摘要
		if content.Type == "markdown" || content.Type == "text" {
			if len(content.Data) > 200 {
				result["summary"] = content.Data[:200] + "..."
			} else {
				result["summary"] = content.Data
			}
		} else if content.Type == "image" {
			result["thumbnail_url"] = content.Data
			result["image_url"] = content.Data
			result["content_url"] = content.Data
		}
	}

	// 返回结果
	c.JSON(http.StatusOK, result)
}

// EditContentPageHandler 显示编辑内容页面
func EditContentPageHandler(c *gin.Context) {
	// 获取客户端标识
	clientIdentifier := data.GetClientIdentifier(c.Request)

	// 获取内容ID
	contentID := c.Query("content_id")
	if contentID == "" {
		c.Redirect(http.StatusFound, "/my-content")
		return
	}

	// 加载内容
	content, err := data.LoadContentBySource(contentID, clientIdentifier)
	if err != nil {
		c.HTML(http.StatusNotFound, "error.html", gin.H{
			"error":   "找不到内容或您无权编辑",
			"details": "您请求编辑的内容不存在，或者您没有权限编辑此内容。",
		})
		return
	}

	// 对内容数据进行JSON编码，确保安全地传递给JavaScript
	contentJSON, err := json.Marshal(content.Data)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error":   "处理内容数据时出错",
			"details": fmt.Sprintf("无法编码内容数据: %v", err),
		})
		return
	}

	// 根据内容类型渲染不同模板
	c.HTML(http.StatusOK, "edit.html", gin.H{
		"short_id":    content.ShortID,
		"type":        content.Type,
		"content":     string(contentJSON),
		"content_raw": content.Data,
		"title":       content.Title,
		"is_public":   content.IsPublic,
	})
}

// EditContentByPathHandler 通过路径参数处理编辑内容页面（兼容旧URL格式）
func EditContentByPathHandler(c *gin.Context) {
	// 获取客户端标识
	clientIdentifier := data.GetClientIdentifier(c.Request)

	// 从路径参数获取内容ID
	shortID := c.Param("shortID")
	if shortID == "" {
		c.Redirect(http.StatusFound, "/my-content")
		return
	}

	// 加载内容
	content, err := data.LoadContentBySource(shortID, clientIdentifier)
	if err != nil {
		c.HTML(http.StatusNotFound, "error.html", gin.H{
			"error":   "找不到内容或您无权编辑",
			"details": "您请求编辑的内容不存在，或者您没有权限编辑此内容。",
		})
		return
	}

	// 对内容数据进行JSON编码，确保安全地传递给JavaScript
	contentJSON, err := json.Marshal(content.Data)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"error":   "处理内容数据时出错",
			"details": fmt.Sprintf("无法编码内容数据: %v", err),
		})
		return
	}

	// 根据内容类型渲染不同模板
	c.HTML(http.StatusOK, "edit.html", gin.H{
		"short_id":    content.ShortID,
		"type":        content.Type,
		"content":     string(contentJSON),
		"content_raw": content.Data,
		"title":       content.Title,
		"is_public":   content.IsPublic,
	})
}

// UpdateContentHandler 处理内容更新请求
func UpdateContentHandler(c *gin.Context) {
	// 获取客户端标识
	clientIdentifier := data.GetClientIdentifier(c.Request)

	// 获取内容ID
	contentID := c.PostForm("content_id")
	if contentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "未提供内容ID"})
		return
	}

	log.Printf("处理内容更新请求, 内容ID: %s, 客户端ID: %s", contentID, clientIdentifier)

	// 加载现有内容
	content, err := data.LoadContentBySource(contentID, clientIdentifier)
	if err != nil {
		log.Printf("加载内容失败: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "找不到内容或您无权编辑"})
		return
	}

	// 获取更新后的标题
	newTitle := c.PostForm("title")
	if newTitle != "" {
		content.Title = newTitle
	}

	// 获取公开设置
	content.IsPublic = c.PostForm("is_public") == "true"

	// 记录内容类型和是否有新内容提交
	log.Printf("内容类型: %s, 标题: %s, 公开状态: %v", content.Type, content.Title, content.IsPublic)

	// 如果是文本或Markdown类型，更新内容数据
	if content.Type == "text" || content.Type == "markdown" {
		newContent := c.PostForm("content")
		if newContent != "" {
			content.Data = newContent
			log.Printf("更新文本/Markdown内容, 长度: %d", len(newContent))
		}
	} else if content.Type == "image" {
		// 图片类型不需要更新内容本身，只更新标题和公开状态
		// 但为了调试，我们记录一下是否收到了content参数
		if newContent := c.PostForm("content"); newContent != "" {
			log.Printf("收到图片内容更新请求，但图片内容无需更新，收到的内容长度: %d", len(newContent))
		} else {
			log.Printf("图片内容编辑，未收到content参数，保持原始图片路径: %s", content.Data)
		}
	}

	// 更新修改时间
	content.UpdateTime = time.Now()

	// 保存更新
	if err := data.UpdateContent(&content); err != nil {
		log.Printf("保存内容更新失败: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新内容失败"})
		return
	}

	log.Printf("内容更新成功: ID=%s, 类型=%s", content.ShortID, content.Type)

	// 返回成功消息
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "内容已成功更新",
		"type":    content.Type,
		"id":      content.ShortID,
	})
}
