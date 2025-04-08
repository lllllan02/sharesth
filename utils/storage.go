package utils

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"

	"sharesth/models"
)

// 保存内容到独立文件
func SaveContent(shortID string, content models.Content) error {
	// 确保数据目录存在
	if err := os.MkdirAll(models.DataDir, 0755); err != nil {
		return err
	}

	// 保存索引信息
	models.ContentMap[shortID] = content

	// 内容文件路径
	contentFile := filepath.Join(models.DataDir, shortID+".json")

	// 将内容保存为JSON文件
	data, err := json.MarshalIndent(content, "", "  ")
	if err != nil {
		return err
	}

	// 写入文件
	if err := os.WriteFile(contentFile, data, 0644); err != nil {
		return err
	}

	// 更新索引文件
	return SaveIndex()
}

// 保存索引信息
func SaveIndex() error {
	// 创建索引结构，包含短链接ID、内容类型、来源和创建时间
	type IndexEntry struct {
		Type       string
		Source     string
		CreateTime time.Time
		Title      string
	}

	index := make(map[string]IndexEntry)
	for id, content := range models.ContentMap {
		index[id] = IndexEntry{
			Type:       content.Type,
			Source:     content.Source,
			CreateTime: content.CreateTime,
			Title:      content.Title,
		}
	}

	// 将索引转换为JSON
	data, err := json.MarshalIndent(index, "", "  ")
	if err != nil {
		return err
	}

	// 写入索引文件
	return os.WriteFile(models.IndexFile, data, 0644)
}

// 加载索引信息
func LoadIndex() error {
	// 检查索引文件是否存在
	if _, err := os.Stat(models.IndexFile); os.IsNotExist(err) {
		return nil // 文件不存在，不需要加载
	}

	// 读取索引文件
	data, err := os.ReadFile(models.IndexFile)
	if err != nil {
		return err
	}

	// 解析索引数据
	type IndexEntry struct {
		Type       string
		Source     string
		CreateTime time.Time
		Title      string
	}

	index := make(map[string]IndexEntry)
	if err := json.Unmarshal(data, &index); err != nil {
		return err
	}

	// 初始化内容映射
	models.ContentMap = make(map[string]models.Content)
	for id, entry := range index {
		models.ContentMap[id] = models.Content{
			Type:       entry.Type,
			Source:     entry.Source,
			CreateTime: entry.CreateTime,
			Title:      entry.Title,
		} // 先不加载内容数据
	}

	return nil
}

// 按需加载内容
func LoadContent(shortID string) (models.Content, error) {
	// 检查内存中是否已有完整数据
	content, exists := models.ContentMap[shortID]
	if exists && content.Data != "" {
		return content, nil
	}

	// 否则从文件加载
	contentFile := filepath.Join(models.DataDir, shortID+".json")
	data, err := os.ReadFile(contentFile)
	if err != nil {
		return models.Content{}, err
	}

	// 解析内容数据
	var loadedContent models.Content
	if err := json.Unmarshal(data, &loadedContent); err != nil {
		return models.Content{}, err
	}

	// 更新内存缓存
	models.ContentMap[shortID] = loadedContent

	return loadedContent, nil
}

// 查找特定来源的所有内容
func FindContentsBySource(source string) []map[string]interface{} {
	var results []map[string]interface{}

	// 遍历内存中的索引
	for id, content := range models.ContentMap {
		if content.Source == source {
			// 添加到结果列表，只包含必要信息
			results = append(results, map[string]interface{}{
				"id":         id,
				"type":       content.Type,
				"createTime": content.CreateTime,
				"link":       "/" + id,
				"title":      content.Title,
			})
		}
	}

	return results
}
