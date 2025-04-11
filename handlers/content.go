package handlers

import (
	"encoding/json"
	"fmt"
	"html/template"
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
	contentID := c.Param("contentID")
	if contentID == "" {
		c.HTML(http.StatusBadRequest, "error.html", gin.H{
			"title": "请求错误",
			"error": "未提供内容ID",
		})
		return
	}

	// 获取来源页面URL
	referer := c.Request.Header.Get("Referer")

	// 加载内容
	content, err := data.LoadContentBySource(contentID, clientIdentifier)
	if err != nil {
		c.HTML(http.StatusNotFound, "error.html", gin.H{
			"title": "内容不存在",
			"error": "找不到内容或您无权编辑",
		})
		return
	}

	// 验证内容类型，拒绝编辑图片内容
	if content.Type == "image" {
		c.HTML(http.StatusBadRequest, "error.html", gin.H{
			"title": "不支持的操作",
			"error": "图片内容暂不支持编辑功能",
		})
		return
	}

	// 构建JSON格式的内容数据
	contentData := map[string]interface{}{
		"id":         content.ID,
		"short_id":   content.ShortID,
		"type":       content.Type,
		"createTime": content.CreateTime,
		"title":      content.Title,
		"is_public":  content.IsPublic,
		"content":    content.Data,
	}

	// 将内容数据转换为JSON字符串
	jsonData, err := json.Marshal(contentData)
	if err != nil {
		c.HTML(http.StatusInternalServerError, "error.html", gin.H{
			"title": "服务器错误",
			"error": "处理内容数据时出错",
		})
		return
	}

	// 渲染编辑页面
	c.HTML(http.StatusOK, "edit.html", gin.H{
		"content_json": template.JS(jsonData),
		"referer":      referer, // 传递来源页面URL
	})
}

// UpdateContentHandler 处理更新内容的请求
func UpdateContentHandler(c *gin.Context) {
	// 获取客户端标识
	clientIdentifier := data.GetClientIdentifier(c.Request)

	// 获取内容ID - 从请求体获取
	contentID := c.PostForm("content_id")
	if contentID == "" {
		// 尝试从URL参数获取
		contentID = c.Query("content_id")
		if contentID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "未提供内容ID"})
			return
		}
	}

	// 加载原有内容
	content, err := data.LoadContentBySource(contentID, clientIdentifier)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "找不到内容或您无权编辑"})
		return
	}

	// 验证内容类型，拒绝更新图片内容
	if content.Type == "image" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "图片内容暂不支持编辑功能"})
		return
	}

	// 获取内容数据
	contentText := c.PostForm("content")
	contentTitle := c.PostForm("title")
	isPublic := c.PostForm("is_public") == "true"

	// 更新内容
	content.Data = contentText
	if contentTitle != "" {
		content.Title = contentTitle
	}
	content.IsPublic = isPublic
	content.UpdateTime = time.Now() // 更新最后修改时间

	// 保存更新
	err = data.UpdateContent(&content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新内容失败: " + err.Error()})
		return
	}

	// 返回成功信息
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "内容已成功更新",
	})
}
