package utils

// 常量定义
const (
	// 上传目录
	UploadsDir = "uploads"

	// ID长度相关
	DefaultUserIDLength  = 4 // 默认用户ID长度
	MaxUserIDLength      = 8 // 建议的用户ID最大长度（不是硬性限制）
	MaxRetryAtSameLength = 5 // 同一长度下最大重试次数
)

// 过滤空字符串
func filterEmpty(strs []string) []string {
	var result []string
	for _, s := range strs {
		if s != "" {
			result = append(result, s)
		}
	}
	return result
}
