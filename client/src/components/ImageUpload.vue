<template>
  <div class="image-upload">
    <!-- 已上传：预览 + 删除 -->
    <div v-if="modelValue" class="preview">
      <img :src="modelValue" alt="封面预览" />
      <div class="preview-mask">
        <el-icon class="mask-btn" @click="previewImage"><ZoomIn /></el-icon>
        <el-icon class="mask-btn" @click="removeImage"><Delete /></el-icon>
      </div>
    </div>

    <!-- 上传中：进度显示 -->
    <div v-else-if="uploading" class="uploading">
      <el-progress type="circle" :percentage="progress" :width="70" />
      <p class="text-muted">上传中 {{ progress }}%</p>
    </div>

    <!-- 待上传 -->
    <el-upload
      v-else
      :show-file-list="false"
      :before-upload="beforeUpload"
      :http-request="customUpload"
      accept="image/jpeg,image/png,image/gif,image/webp"
      drag
      class="uploader"
    >
      <el-icon class="el-icon--upload"><Plus /></el-icon>
      <div class="el-upload__text">点击或拖拽图片到此处上传</div>
      <template #tip>
        <div class="el-upload__tip">
          支持 jpg/png/gif/webp，单张不超过 {{ maxSizeMB }}MB
        </div>
      </template>
    </el-upload>

    <el-image-viewer
      v-if="viewerVisible"
      :url-list="[modelValue]"
      @close="viewerVisible = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, ZoomIn, Delete } from '@element-plus/icons-vue';
import { uploadImage } from '@/api/upload';
import { validateImageType, validateImageSize } from '@/utils/validators';

const props = defineProps({
  modelValue: { type: String, default: '' },
  maxSizeMB: { type: Number, default: 2 }
});
const emit = defineEmits(['update:modelValue']);

const uploading = ref(false);
const progress = ref(0);
const viewerVisible = ref(false);

/** 上传前：格式 + 大小双重前端校验（后端仍会再次校验） */
function beforeUpload(file) {
  if (!validateImageType(file)) {
    ElMessage.error('仅支持 jpg/jpeg/png/gif/webp 格式的图片');
    return false;
  }
  if (!validateImageSize(file, props.maxSizeMB * 1024 * 1024)) {
    ElMessage.error(`图片大小不能超过 ${props.maxSizeMB}MB`);
    return false;
  }
  return true;
}

/** 自定义上传：接管 el-upload 以支持进度回调 */
async function customUpload({ file }) {
  uploading.value = true;
  progress.value = 0;
  try {
    const data = await uploadImage(file, (percent) => {
      progress.value = percent;
    });
    emit('update:modelValue', data.url);
    ElMessage.success('图片上传成功');
  } catch (e) {
    // 错误提示已由响应拦截器统一处理
  } finally {
    uploading.value = false;
  }
}

function removeImage() {
  emit('update:modelValue', '');
}

function previewImage() {
  viewerVisible.value = true;
}
</script>

<style scoped>
.image-upload {
  width: 260px;
}

.uploader :deep(.el-upload-dragger) {
  width: 260px;
  height: 150px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.preview {
  position: relative;
  width: 260px;
  height: 150px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
}

.preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preview-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  opacity: 0;
  transition: opacity 0.2s;
}

.preview:hover .preview-mask {
  opacity: 1;
}

.mask-btn {
  color: #fff;
  font-size: 22px;
  cursor: pointer;
}

.uploading {
  width: 260px;
  height: 150px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
</style>
