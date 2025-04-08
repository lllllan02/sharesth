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
