package utils

// 常量定义
const (
	// 上传目录
	UploadsDir = "uploads"
)

// FilterEmpty 过滤空字符串
func FilterEmpty(strs []string) []string {
	var result []string
	for _, s := range strs {
		if s != "" {
			result = append(result, s)
		}
	}
	return result
}
