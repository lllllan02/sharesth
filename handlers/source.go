package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"sharesth/data"
)

// SourceSearchPageHandler 显示查询用户分享记录页面
func SourceSearchPageHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "source_search.html", nil)
}

// SourceContentHandler 根据来源查询内容
func SourceContentHandler(c *gin.Context) {
	// 获取查询参数中的来源
	source := c.Query("source")
	if source == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少来源参数"})
		return
	}

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
	total, results, typeCounts := data.FindContentsBySourcePaginated(source, query, typeFilter, page, perPage)

	// 返回JSON结果
	c.JSON(http.StatusOK, gin.H{
		"source":     source,
		"total":      total,
		"page":       page,
		"per_page":   perPage,
		"items":      results,
		"typeCounts": typeCounts,
	})
}

// SourceSearchAPIHandler 返回指定来源内容的API处理函数
func SourceSearchAPIHandler(c *gin.Context) {
	// 获取指定的来源
	source := c.Query("source")
	if source == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "未指定来源"})
		return
	}

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
	total, results, typeCounts := data.FindContentsBySourcePaginated(source, query, typeFilter, page, perPage)

	// 返回JSON结果
	c.JSON(http.StatusOK, gin.H{
		"source":     source,
		"total":      total,
		"page":       page,
		"per_page":   perPage,
		"items":      results,
		"typeCounts": typeCounts,
	})
}
