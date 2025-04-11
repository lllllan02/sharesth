package handlers

import (
	"fmt"
	"net/http"
	"strconv"

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
		c.JSON(http.StatusBadRequest, gin.H{"error": "未提供内容ID"})
		return
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "未提供内容ID"})
		return
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
