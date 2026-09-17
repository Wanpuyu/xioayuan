/**
 * 通用校验规则库（Element Plus el-form rules 格式）
 * 覆盖预约/活动/账号场景 10+ 项规则，与组件解耦、可复用
 */
import { checkUsername } from '@/api/auth';

/** 必填 */
export const requiredRule = (label, trigger = 'blur') => ({
  required: true,
  message: `请填写${label}`,
  trigger
});

/** 必填选择 */
export const requiredSelectRule = (label) => ({
  required: true,
  message: `请选择${label}`,
  trigger: 'change'
});

/** 用户名：3-20位字母/数字/下划线 */
export const usernameRule = [
  requiredRule('用户名'),
  {
    pattern: /^[a-zA-Z0-9_]{3,20}$/,
    message: '用户名为3-20位字母、数字或下划线',
    trigger: 'blur'
  }
];

/** 密码：6-20位，需含字母和数字 */
export const passwordRule = [
  requiredRule('密码'),
  {
    validator: (rule, value, callback) => {
      if (!value) return callback();
      if (value.length < 6 || value.length > 20)
        return callback(new Error('密码长度为6-20位'));
      if (!/[a-zA-Z]/.test(value) || !/\d/.test(value))
        return callback(new Error('密码需同时包含字母和数字'));
      callback();
    },
    trigger: 'blur'
  }
];

/** 确认密码 */
export const confirmPasswordRule = (getPwd) => ({
  required: true,
  validator: (rule, value, callback) => {
    if (!value) return callback(new Error('请再次输入密码'));
    if (value !== getPwd()) return callback(new Error('两次输入的密码不一致'));
    callback();
  },
  trigger: 'blur'
});

/** 手机号（选填时空值通过） */
export const phoneRule = (required = true) => ({
  validator: (rule, value, callback) => {
    if (!value) return required ? callback(new Error('请填写手机号')) : callback();
    if (!/^1[3-9]\d{9}$/.test(value)) return callback(new Error('手机号格式不正确'));
    callback();
  },
  trigger: 'blur'
});

/** 邮箱（选填时空值通过） */
export const emailRule = (required = false) => ({
  validator: (rule, value, callback) => {
    if (!value) return required ? callback(new Error('请填写邮箱')) : callback();
    if (!/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(value))
      return callback(new Error('邮箱格式不正确'));
    callback();
  },
  trigger: 'blur'
});

/** 学号：4-20位数字或字母（选填） */
export const studentNoRule = () => ({
  validator: (rule, value, callback) => {
    if (!value) return callback();
    if (!/^[A-Za-z0-9]{4,20}$/.test(value))
      return callback(new Error('学号为4-20位数字或字母'));
    callback();
  },
  trigger: 'blur'
});

/** 数字范围 */
export const numberRangeRule = (label, min, max, required = true) => ({
  validator: (rule, value, callback) => {
    if (value === undefined || value === null || value === '')
      return required ? callback(new Error(`请填写${label}`)) : callback();
    const num = Number(value);
    if (Number.isNaN(num)) return callback(new Error(`${label}必须是数字`));
    if (num < min || num > max)
      return callback(new Error(`${label}需在 ${min} ~ ${max} 之间`));
    callback();
  },
  trigger: 'blur'
});

/** 必填日期时间 */
export const dateRequiredRule = (label) => ({
  required: true,
  message: `请选择${label}`,
  trigger: 'change'
});

/** 结束时间必须晚于参照时间（跨字段校验） */
export const dateLaterThanRule = (getOther, label, otherLabel) => ({
  validator: (rule, value, callback) => {
    if (!value) return callback();
    const other = getOther();
    if (other && new Date(value).getTime() <= new Date(other).getTime())
      return callback(new Error(`${label}必须晚于${otherLabel}`));
    callback();
  },
  trigger: 'change'
});

/** 报名截止不得晚于活动开始 */
export const dateEarlierThanRule = (getOther, label, otherLabel) => ({
  validator: (rule, value, callback) => {
    if (!value) return callback();
    const other = getOther();
    if (other && new Date(value).getTime() > new Date(other).getTime())
      return callback(new Error(`${label}不能晚于${otherLabel}`));
    callback();
  },
  trigger: 'change'
});

/** 文本长度区间 */
export const lengthRule = (label, min, max) => ({
  validator: (rule, value, callback) => {
    if (!value && min > 0) return callback(new Error(`请填写${label}`));
    if (value && (value.length < min || value.length > max))
      return callback(new Error(`${label}长度为${min}-${max}个字符`));
    callback();
  },
  trigger: 'blur'
});

/** 注册页用户名异步唯一性校验（防抖） */
export const usernameAsyncRule = () => {
  let timer = null;
  return {
    validator: (rule, value, callback) => {
      if (!value) return callback();
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(value))
        return callback(new Error('用户名为3-20位字母、数字或下划线'));
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const res = await checkUsername(value);
          res.available ? callback() : callback(new Error('该用户名已被注册'));
        } catch (e) {
          callback(); // 网络异常不阻塞，提交时后端兜底
        }
      }, 400);
    },
    trigger: 'blur'
  };
};

/** 图片格式校验（上传前） */
export const validateImageType = (file) =>
  ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);

/** 图片大小校验（默认 2MB） */
export const validateImageSize = (file, max = 2 * 1024 * 1024) => file.size <= max;
