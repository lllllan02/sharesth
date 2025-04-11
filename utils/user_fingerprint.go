package utils

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"sync"
	"time"

	"sharesth/models"
)

// 全局变量，用于记录已分配的ID，防止重复
var allocatedUserIDs = make(map[string]bool)
var userIDMutex = &sync.Mutex{}

// LoadAllocatedUserIDs 从数据库加载已分配的用户ID
func LoadAllocatedUserIDs() {
	userIDMutex.Lock()
	defer userIDMutex.Unlock()

	// 清空当前的内存缓存
	allocatedUserIDs = make(map[string]bool)

	// 加载已分配的ID
	ids := models.GetAllAllocatedUserIDs()
	for id := range ids {
		allocatedUserIDs[id] = true
	}

	log.Printf("内存中已加载 %d 个已分配的用户ID", len(allocatedUserIDs))
}

// GetClientIdentifier 获取客户端标识 - 基于用户请求的稳定特征生成唯一标识符
func GetClientIdentifier(r *http.Request) string {
	// 第一步：提取浏览器特征并生成哈希
	browserHash, browserInfo := extractBrowserFingerprint(r)

	// 第二步：先从Redis缓存中查找
	if userID, found := GetUserIDFromRedis(browserHash); found {
		log.Printf("从Redis缓存中找到用户ID: %s", userID)
		return userID
	}

	// 第三步：如果Redis中没有，查询数据库
	if userID, found := models.FindUserIDByBrowserHash(browserHash); found {
		log.Printf("从数据库中找到用户ID: %s", userID)
		// 找到后，写入Redis缓存
		SaveUserIDToRedis(browserHash, userID)
		return userID
	}

	// 第四步：Redis和数据库中都没有，生成新的用户ID
	return generateAndSaveUserID(browserHash, browserInfo)
}

// extractBrowserFingerprint 提取浏览器特征并生成指纹哈希
func extractBrowserFingerprint(r *http.Request) (string, string) {
	// 获取更稳定的浏览器特征
	ua := r.UserAgent()
	acceptLang := r.Header.Get("Accept-Language")
	secChUa := r.Header.Get("Sec-Ch-Ua")

	// 模拟前端的指纹生成逻辑，使用最稳定的参数
	stableParams := []string{
		ua,         // User Agent
		acceptLang, // 语言首选项
		secChUa,    // 浏览器品牌信息
	}

	// 过滤掉空值并用特殊分隔符连接
	identifierSource := strings.Join(filterEmpty(stableParams), "###")

	// 用于浏览器特征的详细描述
	browserInfo := fmt.Sprintf("UA: %s, Lang: %s, Sec-Ch-Ua: %s",
		ua, acceptLang, secChUa)

	// 生成MD5哈希作为浏览器特征的唯一标识
	hasher := md5.New()
	hasher.Write([]byte(identifierSource))
	browserHash := hex.EncodeToString(hasher.Sum(nil))

	return browserHash, browserInfo
}

// generateAndSaveUserID 生成新的用户ID并保存到数据库
func generateAndSaveUserID(browserHash string, browserInfo string) string {
	// 互斥锁保护内存中的ID集合
	userIDMutex.Lock()
	defer userIDMutex.Unlock()

	// 先尝试生成默认长度的ID
	userID := tryGenerateUserIDWithIncreasingLength(browserHash, browserInfo)
	if userID != "" {
		return userID
	}

	// 如果常规尝试失败，使用备用方法
	return generateFallbackUserID(browserHash, browserInfo)
}

// tryGenerateUserIDWithIncreasingLength 尝试生成不同长度的用户ID
func tryGenerateUserIDWithIncreasingLength(browserHash string, browserInfo string) string {
	// 使用和分享ID相同的字符集
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

	// 从默认长度开始，不设上限地尝试增加长度
	// 实际上很少会超过MaxUserIDLength，但理论上允许无限增长
	for length := DefaultUserIDLength; ; length++ {
		// 作为保护措施，输出警告日志
		if length > MaxUserIDLength {
			log.Printf("警告：ID长度已超过建议最大值(%d)，当前尝试长度：%d", MaxUserIDLength, length)
		}

		// 在当前长度下多次尝试
		userID := tryGenerateUserIDWithRetries(length, chars, browserHash, browserInfo)
		if userID != "" {
			return userID
		}

		// 当前长度下尝试失败，日志记录并增加长度
		log.Printf("在长度%d下尝试%d次生成ID均失败，增加长度到%d", length, MaxRetryAtSameLength, length+1)
	}

	// 此处永远不会到达
}

// tryGenerateUserIDWithRetries 在指定长度下多次尝试生成用户ID
func tryGenerateUserIDWithRetries(length int, chars string, browserHash string, browserInfo string) string {
	// 在当前长度下尝试多次
	for retry := 0; retry < MaxRetryAtSameLength; retry++ {
		// 为当前尝试生成随机ID
		userID := generateRandomID(length, chars, retry, browserHash)

		// 检查内存中是否已存在
		if _, exists := allocatedUserIDs[userID]; !exists {
			// 分配ID并保存到数据库
			return allocateAndSaveUserID(userID, browserHash, browserInfo, length, retry)
		}
	}

	return "" // 所有尝试均失败
}

// generateRandomID 生成指定长度的随机ID
func generateRandomID(length int, chars string, retry int, browserHash string) string {
	var rnd *rand.Rand

	if retry == 0 && length == DefaultUserIDLength {
		// 第一次尝试使用浏览器特征的哈希作为种子
		hashValue := SimpleHash(browserHash)
		seed := rand.NewSource(int64(hashValue))
		rnd = rand.New(seed)
	} else {
		// 之后的尝试使用真随机
		seed := rand.NewSource(time.Now().UnixNano() + int64(retry*100))
		rnd = rand.New(seed)
	}

	// 生成随机ID
	idBytes := make([]byte, length)
	for i := range idBytes {
		idBytes[i] = chars[rnd.Intn(len(chars))]
	}

	return string(idBytes)
}

// allocateAndSaveUserID 分配ID并保存到数据库
func allocateAndSaveUserID(userID string, browserHash string, browserInfo string, length int, retry int) string {
	// 记录此ID已分配
	allocatedUserIDs[userID] = true

	// 将用户ID与浏览器特征关联保存到数据库
	err := models.SaveUserFingerprint(browserHash, userID, browserInfo)
	if err != nil {
		log.Printf("保存用户指纹信息失败: %v", err)
		// 即使保存失败也继续使用生成的ID
	} else {
		if retry > 0 || length > DefaultUserIDLength {
			log.Printf("为浏览器分配新用户ID(长度=%d,重试=%d): %s", length, retry, userID)
		} else {
			log.Printf("为浏览器分配新用户ID: %s", userID)
		}

		// 同时保存到Redis缓存
		SaveUserIDToRedis(browserHash, userID)
	}

	return userID
}

// generateFallbackUserID 生成备用的用户ID（当常规方法都失败时）
func generateFallbackUserID(browserHash string, browserInfo string) string {
	// 使用和分享ID相同的字符集
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

	// 使用时间戳作为种子生成随机ID
	seed := rand.NewSource(time.Now().UnixNano())
	rnd := rand.New(seed)

	// 最多尝试10次
	for retry := 0; retry < 10; retry++ {
		idBytes := make([]byte, MaxUserIDLength)
		for i := range idBytes {
			idBytes[i] = chars[rnd.Intn(len(chars))]
		}
		randomID := string(idBytes)

		if _, exists := allocatedUserIDs[randomID]; !exists {
			allocatedUserIDs[randomID] = true

			// 保存到数据库
			err := models.SaveUserFingerprint(browserHash, randomID, browserInfo)
			if err != nil {
				log.Printf("保存用户指纹信息失败: %v", err)
			} else {
				log.Printf("所有长度尝试失败，生成最终随机用户ID: %s", randomID)
				// 同时保存到Redis缓存
				SaveUserIDToRedis(browserHash, randomID)
			}

			return randomID
		}
	}

	// 极端情况下，生成带时间戳的特殊ID
	timeComponent := fmt.Sprintf("%x", time.Now().UnixNano())
	finalID := timeComponent[:MaxUserIDLength]
	allocatedUserIDs[finalID] = true

	models.SaveUserFingerprint(browserHash, finalID, browserInfo)
	// 同时保存到Redis缓存
	SaveUserIDToRedis(browserHash, finalID)
	log.Printf("生成基于时间戳的最终用户ID: %s", finalID)

	return finalID
}
