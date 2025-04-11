package data

import (
	"context"
	"log"
	"time"

	"github.com/go-redis/redis/v8"
)

var (
	RedisClient *redis.Client
	Ctx         = context.Background()
)

// 用户ID在Redis中的过期时间（24小时）
const UserIDCacheExpiration = 24 * time.Hour

// InitRedisClient 初始化Redis客户端连接
func InitRedisClient() {
	RedisClient = redis.NewClient(&redis.Options{
		Addr:     "localhost:6379", // Redis默认地址
		Password: "",               // 无密码
		DB:       0,                // 默认DB
	})

	// 测试连接
	_, err := RedisClient.Ping(Ctx).Result()
	if err != nil {
		log.Printf("Redis连接失败: %v", err)
	} else {
		log.Println("Redis连接成功")
	}
}

// CloseRedisClient 关闭Redis客户端连接
func CloseRedisClient() {
	if RedisClient != nil {
		if err := RedisClient.Close(); err != nil {
			log.Printf("关闭Redis连接失败: %v", err)
		} else {
			log.Println("Redis连接关闭成功")
		}
	}
}

// GetUserIDFromRedis 从Redis获取用户ID
func GetUserIDFromRedis(browserHash string) (string, bool) {
	// 如果Redis客户端未初始化，返回false
	if RedisClient == nil {
		return "", false
	}

	// 设置键名前缀，便于管理
	key := "user_id:" + browserHash

	// 从Redis获取用户ID
	userID, err := RedisClient.Get(Ctx, key).Result()
	if err == redis.Nil {
		// 键不存在
		return "", false
	} else if err != nil {
		// 其他错误
		log.Printf("从Redis获取用户ID失败: %v", err)
		return "", false
	}

	// 找到用户ID，更新过期时间
	RedisClient.Expire(Ctx, key, UserIDCacheExpiration)
	return userID, true
}

// SaveUserIDToRedis 保存用户ID到Redis
func SaveUserIDToRedis(browserHash string, userID string) {
	// 如果Redis客户端未初始化，直接返回
	if RedisClient == nil {
		return
	}

	// 设置键名前缀，便于管理
	key := "user_id:" + browserHash

	// 保存到Redis，设置过期时间
	err := RedisClient.Set(Ctx, key, userID, UserIDCacheExpiration).Err()
	if err != nil {
		log.Printf("保存用户ID到Redis失败: %v", err)
	}
}
