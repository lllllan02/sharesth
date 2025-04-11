package data

import (
	"log"
	"time"

	"sharesth/models"
)

// FindUserIDByBrowserHash 根据浏览器哈希查找用户ID
func FindUserIDByBrowserHash(browserHash string) (string, bool) {
	// 先从Redis缓存查询
	if userID, found := GetUserIDFromRedis(browserHash); found {
		return userID, true
	}

	// Redis中没有，查询数据库
	var fingerprint models.UserFingerprint
	result := DB.Where("browser_hash = ?", browserHash).First(&fingerprint)
	if result.Error != nil {
		return "", false
	}

	// 更新最近访问时间
	DB.Model(&fingerprint).Update("last_seen_at", time.Now())

	// 将结果写入Redis缓存
	SaveUserIDToRedis(browserHash, fingerprint.UserID)

	return fingerprint.UserID, true
}

// SaveUserFingerprint 保存用户浏览器指纹信息
func SaveUserFingerprint(browserHash string, userID string, browserInfo string) error {
	// 检查是否已存在记录
	var count int64
	DB.Model(&models.UserFingerprint{}).Where("browser_hash = ?", browserHash).Count(&count)

	var err error
	if count > 0 {
		// 已存在记录，更新最近访问时间
		err = DB.Model(&models.UserFingerprint{}).
			Where("browser_hash = ?", browserHash).
			Updates(map[string]interface{}{
				"last_seen_at": time.Now(),
			}).Error
	} else {
		// 创建新记录
		fingerprint := models.UserFingerprint{
			BrowserHash: browserHash,
			UserID:      userID,
			BrowserInfo: browserInfo,
			CreatedAt:   time.Now(),
			LastSeenAt:  time.Now(),
		}
		err = DB.Create(&fingerprint).Error
	}

	// 无论是更新还是创建，都保存到Redis缓存
	if err == nil {
		SaveUserIDToRedis(browserHash, userID)
	}

	return err
}

// GetAllAllocatedUserIDs 获取所有已分配的用户ID
func GetAllAllocatedUserIDs() map[string]bool {
	result := make(map[string]bool)
	var fingerprints []models.UserFingerprint

	// 查询所有用户指纹记录
	if err := DB.Select("user_id").Find(&fingerprints).Error; err != nil {
		log.Printf("加载用户ID记录失败: %v", err)
		return result
	}

	// 将所有用户ID标记为已分配
	for _, fp := range fingerprints {
		result[fp.UserID] = true
	}

	log.Printf("从数据库加载了 %d 个已分配的用户ID", len(result))
	return result
}
