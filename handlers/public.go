package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"sharesth/data"
)

// PublicContentPageHandler 显示公开内容页面
func PublicContentPageHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "public.html", nil)
}

// PublicContentAPIHandler 获取所有公开内容
func PublicContentAPIHandler(c *gin.Context) {
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
	total, results, typeCounts := data.FindPublicContentsPaginated(query, typeFilter, page, perPage)

	// 返回JSON结果
	c.JSON(http.StatusOK, gin.H{
		"total":      total,
		"page":       page,
		"per_page":   perPage,
		"items":      results,
		"typeCounts": typeCounts,
	})
}
