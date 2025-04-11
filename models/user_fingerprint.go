package models

import (
	"log"
	"time"
)

// UserFingerprint 存储用户浏览器指纹信息与用户ID的对应关系
type UserFingerprint struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	BrowserHash string    `json:"browser_hash" gorm:"type:varchar(64);uniqueIndex"` // 浏览器特征的哈希值
	UserID      string    `json:"user_id" gorm:"type:varchar(10)"`                  // 分配给用户的唯一标识
	BrowserInfo string    `json:"browser_info" gorm:"type:text"`                    // 详细的浏览器信息
	CreatedAt   time.Time `json:"created_at"`                                       // 首次创建时间
	LastSeenAt  time.Time `json:"last_seen_at"`                                     // 最近访问时间
}

// TableName 指定表名
func (UserFingerprint) TableName() string {
	return "user_fingerprints"
}

// FindUserIDByBrowserHash 根据浏览器哈希查找用户ID
func FindUserIDByBrowserHash(browserHash string) (string, bool) {
	var fingerprint UserFingerprint
	result := DB.Where("browser_hash = ?", browserHash).First(&fingerprint)
	if result.Error != nil {
		return "", false
	}

	// 更新最近访问时间
	DB.Model(&fingerprint).Update("last_seen_at", time.Now())

	return fingerprint.UserID, true
}

// SaveUserFingerprint 保存用户浏览器指纹信息
func SaveUserFingerprint(browserHash string, userID string, browserInfo string) error {
	// 检查是否已存在记录
	var count int64
	DB.Model(&UserFingerprint{}).Where("browser_hash = ?", browserHash).Count(&count)

	if count > 0 {
		// 已存在记录，更新最近访问时间
		return DB.Model(&UserFingerprint{}).
			Where("browser_hash = ?", browserHash).
			Updates(map[string]interface{}{
				"last_seen_at": time.Now(),
			}).Error
	} else {
		// 创建新记录
		fingerprint := UserFingerprint{
			BrowserHash: browserHash,
			UserID:      userID,
			BrowserInfo: browserInfo,
			CreatedAt:   time.Now(),
			LastSeenAt:  time.Now(),
		}
		return DB.Create(&fingerprint).Error
	}
}

// GetAllAllocatedUserIDs 获取所有已分配的用户ID
func GetAllAllocatedUserIDs() map[string]bool {
	result := make(map[string]bool)
	var fingerprints []UserFingerprint

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
