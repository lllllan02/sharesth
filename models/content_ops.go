package models

import (
	"fmt"
)

// SaveContent 保存内容到数据库
func SaveContent(shortID string, content Content) error {
	// 设置短链接ID
	content.ShortID = shortID

	// 保存到数据库
	result := DB.Create(&content)
	if result.Error != nil {
		return fmt.Errorf("保存内容到数据库失败: %v", result.Error)
	}

	return nil
}

// LoadContent 根据短链接ID加载内容
func LoadContent(shortID string) (Content, error) {
	var content Content
	result := DB.Where("short_id = ?", shortID).First(&content)
	if result.Error != nil {
		return Content{}, fmt.Errorf("加载内容失败: %v", result.Error)
	}

	return content, nil
}

// FindContentsBySource 查找指定来源的所有内容
func FindContentsBySource(source string) []map[string]interface{} {
	var contents []Content
	DB.Where("source = ?", source).Order("create_time DESC").Find(&contents)

	var results []map[string]interface{}
	for _, content := range contents {
		results = append(results, map[string]interface{}{
			"id":         content.ID,
			"short_id":   content.ShortID,
			"type":       content.Type,
			"createTime": content.CreateTime,
			"link":       "/" + content.ShortID,
			"title":      content.Title,
			"is_public":  content.IsPublic,
		})
	}

	return results
}

// FindPublicContents 查找所有公开的内容
func FindPublicContents() []map[string]interface{} {
	var contents []Content
	DB.Where("is_public = ?", true).Order("create_time DESC").Find(&contents)

	var results []map[string]interface{}
	for _, content := range contents {
		results = append(results, map[string]interface{}{
			"id":         content.ID,
			"short_id":   content.ShortID,
			"type":       content.Type,
			"createTime": content.CreateTime,
			"link":       "/" + content.ShortID,
			"title":      content.Title,
		})
	}

	return results
}

// FindContentsBySourcePaginated 分页查找指定来源的内容，支持标题搜索
func FindContentsBySourcePaginated(source string, query string, page int, perPage int) (int64, []map[string]interface{}) {
	var contents []Content
	db := DB.Where("source = ?", source)

	// 如果提供了搜索查询，添加标题搜索条件
	if query != "" {
		db = db.Where("title LIKE ?", "%"+query+"%")
	}

	// 计算总记录数
	var total int64
	db.Model(&Content{}).Count(&total)

	// 分页查询
	offset := (page - 1) * perPage
	db.Order("create_time DESC").Offset(offset).Limit(perPage).Find(&contents)

	// 格式化结果
	var results []map[string]interface{}
	for _, content := range contents {
		// 提取内容摘要
		var summary string
		if content.Type == "image" {
			// 图片内容不需要摘要
			summary = ""
		} else {
			// 文本或Markdown内容，提取前150个字符作为摘要
			if len(content.Data) > 150 {
				summary = content.Data[:150] + "..."
			} else {
				summary = content.Data
			}
		}

		// 构建基本结果
		result := map[string]interface{}{
			"id":         content.ID,
			"short_id":   content.ShortID,
			"type":       content.Type,
			"createTime": content.CreateTime,
			"link":       "/" + content.ShortID,
			"title":      content.Title,
			"is_public":  content.IsPublic,
			"summary":    summary, // 添加内容摘要
		}

		// 根据内容类型添加特定字段
		if content.Type == "image" {
			// 对于图片类型，添加图片URL
			result["content_url"] = content.Data // 图片路径作为内容URL
		} else {
			// 对于文本类型，添加完整内容
			result["content"] = content.Data
		}

		results = append(results, result)
	}

	return total, results
}

// FindPublicContentsPaginated 分页查找公开的内容，支持标题搜索
func FindPublicContentsPaginated(query string, page int, perPage int) (int64, []map[string]interface{}) {
	var contents []Content
	db := DB.Where("is_public = ?", true)

	// 如果提供了搜索查询，添加标题搜索条件
	if query != "" {
		db = db.Where("title LIKE ?", "%"+query+"%")
	}

	// 计算总记录数
	var total int64
	db.Model(&Content{}).Count(&total)

	// 分页查询
	offset := (page - 1) * perPage
	db.Order("create_time DESC").Offset(offset).Limit(perPage).Find(&contents)

	// 格式化结果
	var results []map[string]interface{}
	for _, content := range contents {
		results = append(results, map[string]interface{}{
			"id":         content.ID,
			"short_id":   content.ShortID,
			"type":       content.Type,
			"createTime": content.CreateTime,
			"link":       "/" + content.ShortID,
			"title":      content.Title,
		})
	}

	return total, results
}

// DeleteContent 根据短链接ID和来源删除内容
func DeleteContent(shortID string, source string) error {
	// 查找指定的内容
	var content Content
	result := DB.Where("short_id = ? AND source = ?", shortID, source).First(&content)
	if result.Error != nil {
		return fmt.Errorf("内容不存在或无权删除: %v", result.Error)
	}

	// 执行删除操作
	result = DB.Delete(&content)
	if result.Error != nil {
		return fmt.Errorf("删除内容失败: %v", result.Error)
	}

	return nil
}
