package data

import (
	"fmt"

	"sharesth/models"
)

// SaveContent 保存内容到数据库
func SaveContent(shortID string, content models.Content) error {
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
func LoadContent(shortID string) (models.Content, error) {
	var content models.Content
	result := DB.Where("short_id = ?", shortID).First(&content)
	if result.Error != nil {
		return models.Content{}, fmt.Errorf("加载内容失败: %v", result.Error)
	}

	return content, nil
}

// LoadContentBySource 根据短链接ID和来源加载内容
func LoadContentBySource(shortID string, source string) (models.Content, error) {
	var content models.Content
	result := DB.Where("short_id = ? AND source = ?", shortID, source).First(&content)
	if result.Error != nil {
		return models.Content{}, fmt.Errorf("加载内容失败: %v", result.Error)
	}

	return content, nil
}

// FindContentsBySource 查找指定来源的所有内容
func FindContentsBySource(source string) []map[string]interface{} {
	var contents []models.Content
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
	var contents []models.Content
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

// FindContentsBySourcePaginated 分页查找指定来源的内容，支持标题搜索和类型筛选
func FindContentsBySourcePaginated(source string, query string, typeFilter string, page int, perPage int) (int64, []map[string]interface{}, map[string]int64) {
	var contents []models.Content
	db := DB.Where("source = ?", source)

	// 如果提供了搜索查询，添加标题搜索条件
	if query != "" {
		db = db.Where("title LIKE ?", "%"+query+"%")
	}

	// 如果提供了类型筛选，添加类型条件
	if typeFilter != "" {
		db = db.Where("type = ?", typeFilter)
	}

	// 计算总记录数
	var total int64
	db.Model(&models.Content{}).Count(&total)

	// 统计各类型数量
	typeCounts := make(map[string]int64)
	var typeStats []struct {
		Type  string `gorm:"column:type"`
		Count int64  `gorm:"column:count"`
	}

	DB.Model(&models.Content{}).
		Where("source = ?", source).
		Select("type, count(*) as count").
		Group("type").
		Scan(&typeStats)

	for _, stat := range typeStats {
		typeCounts[stat.Type] = stat.Count
	}

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
			"is_public":  content.IsPublic,
		})
	}

	return total, results, typeCounts
}

// FindPublicContentsPaginated 分页查找公开内容，支持标题搜索
func FindPublicContentsPaginated(query string, page int, perPage int) (int64, []map[string]interface{}) {
	var contents []models.Content
	db := DB.Where("is_public = ?", true)

	// 如果提供了搜索查询，添加标题搜索条件
	if query != "" {
		db = db.Where("title LIKE ?", "%"+query+"%")
	}

	// 计算总记录数
	var total int64
	db.Model(&models.Content{}).Count(&total)

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
	var content models.Content
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

// UpdateContent 更新内容
func UpdateContent(content *models.Content) error {
	result := DB.Save(content)
	if result.Error != nil {
		return fmt.Errorf("更新内容失败: %v", result.Error)
	}

	return nil
}
