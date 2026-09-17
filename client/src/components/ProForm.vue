<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="formRules"
    :label-width="labelWidth"
    :label-position="labelPosition"
    :disabled="disabled"
  >
    <el-row :gutter="16">
      <el-col
        v-for="field in fields"
        :key="field.prop"
        :xs="field.xs || 24"
        :sm="field.sm || 12"
        :md="field.md || field.span || 12"
      >
        <el-form-item :label="field.label" :prop="field.prop">
          <!-- 自定义插槽：用于图片上传等复杂控件 -->
          <slot v-if="field.type === 'slot'" :name="field.slot" :form="form" :field="field" />

          <el-input
            v-else-if="field.type === 'input' || !field.type"
            v-model="form[field.prop]"
            :placeholder="field.placeholder || `请输入${field.label}`"
            :maxlength="field.maxlength"
            show-word-limit
            clearable
          />

          <el-input
            v-else-if="field.type === 'password'"
            v-model="form[field.prop]"
            type="password"
            show-password
            :placeholder="field.placeholder || `请输入${field.label}`"
            clearable
          />

          <el-input
            v-else-if="field.type === 'textarea'"
            v-model="form[field.prop]"
            type="textarea"
            :rows="field.rows || 4"
            :maxlength="field.maxlength || 500"
            show-word-limit
            :placeholder="field.placeholder || `请输入${field.label}`"
          />

          <el-input-number
            v-else-if="field.type === 'number'"
            v-model="form[field.prop]"
            :min="field.min ?? 0"
            :max="field.max"
            :step="field.step || 1"
            controls-position="right"
            class="full-width"
          />

          <el-select
            v-else-if="field.type === 'select'"
            v-model="form[field.prop]"
            :placeholder="field.placeholder || `请选择${field.label}`"
            clearable
            class="full-width"
          >
            <el-option
              v-for="opt in field.options"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>

          <el-date-picker
            v-else-if="field.type === 'date'"
            v-model="form[field.prop]"
            type="date"
            value-format="YYYY-MM-DD"
            :placeholder="field.placeholder || `请选择${field.label}`"
            class="full-width"
          />

          <el-date-picker
            v-else-if="field.type === 'datetime'"
            v-model="form[field.prop]"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm"
            :placeholder="field.placeholder || `请选择${field.label}`"
            class="full-width"
          />

          <el-switch
            v-else-if="field.type === 'switch'"
            v-model="form[field.prop]"
            :active-text="field.activeText"
            :inactive-text="field.inactiveText"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-form-item v-if="$slots.footer || showFooter" class="form-footer">
      <slot name="footer">
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ submitText }}
        </el-button>
        <el-button @click="resetFields">重置</el-button>
      </slot>
    </el-form-item>
  </el-form>
</template>

<script setup>
import { reactive, ref, watch, computed } from 'vue';

const props = defineProps({
  modelValue: { type: Object, required: true },
  fields: { type: Array, required: true },
  labelWidth: { type: String, default: '100px' },
  labelPosition: { type: String, default: 'right' },
  disabled: Boolean,
  submitting: Boolean,
  showFooter: { type: Boolean, default: false },
  submitText: { type: String, default: '提交' }
});

const emit = defineEmits(['update:modelValue', 'submit']);

const formRef = ref(null);
const form = reactive({ ...props.modelValue });

// 由 fields 配置自动生成校验规则
const formRules = computed(() => {
  const rules = {};
  props.fields.forEach((f) => {
    if (f.rules) rules[f.prop] = f.rules;
  });
  return rules;
});

// 外部回填（编辑场景）同步到表单
watch(
  () => props.modelValue,
  (val) => {
    Object.keys(val).forEach((key) => {
      form[key] = val[key];
    });
  },
  { deep: true }
);

// 表单变化向外交付 v-model
watch(
  form,
  (val) => {
    emit('update:modelValue', { ...val });
  },
  { deep: true }
);

async function validate() {
  return formRef.value.validate();
}

function resetFields() {
  formRef.value?.resetFields();
}

function clearValidate(fields) {
  formRef.value?.clearValidate(fields);
}

async function handleSubmit() {
  await validate();
  emit('submit', { ...form });
}

defineExpose({ validate, resetFields, clearValidate, form });
</script>

<style scoped>
.full-width {
  width: 100%;
}
.form-footer {
  margin-bottom: 0;
}
</style>
