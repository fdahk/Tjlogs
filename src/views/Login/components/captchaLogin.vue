<script setup>
  import { defineEmits, ref } from 'vue';
  import { handleGetCaptchaReq,handleCaptchaLoginReq } from '@/apis/login';
  import { useLoginStore } from '@/stores/login';
  import { showToast } from '@/utils/toast';
  import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
  const emit = defineEmits(['change']);
  const router = useRouter();
  const change = () => {
    emit('change');
  }
  // 数据 
  const userPhone = ref('')
  const captcha = ref('');       // 验证码
  const countdown = ref(0);      // 倒计时（秒 
  const otherLoginList = [
    {
      name: '微信',
      icon: 'icon-wechat-fill',
      color: 'green'
    },
    {
      name: 'QQ',
      icon: 'icon-QQ',
      color: 'rgba(58, 114, 170, 1)'
    },
    {
      name: '支付宝',
      icon: 'icon-alipay',
      color: 'rgba(58, 114, 170, 1)'
    },
    {
      name: 'GitHub',
      icon: 'icon-github-fill',
      color: 'black'
    }
  ]
  // 获取验证码
  const handleGetCaptcha = async () => {
    // 验证手机号格式
    // 以1开头（中国大陆手机号都是1开头）
    // [3-9]：第二位是3-9之间的数字（目前中国大陆手机号第二位不会是0、1、2）
    // \d{9}：后面跟9个数字（0-9）
    if (!/^1[3-9]\d{9}$/.test(userPhone.value)) {
      showToast('请输入有效的11位手机号');
      return
    }
    // 调用获取验证码请求
    await handleGetCaptchaReq({ userPhone: userPhone.value });
    countdown.value = 60;  // 设置倒计时为60秒
    const timer = setInterval(() => {
      if (countdown.value > 0) {
        countdown.value--;
      } else {
        clearInterval(timer);  // 清除定时器
      }
    }, 1000);
  }  
  // 登录请求
  const handleLogin = async () => {
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(userPhone.value)) {
      showToast('请输入有效的11位手机号');
      return;
    }
    // 调用登录请求，返回token等 
    const res = await handleCaptchaLoginReq({userPhone: userPhone.value, captcha: captcha.value})
    if(res.data.code === 200) {
      showToast(res.data.message)
      useLoginStore().closeLogin()  // 关闭登录页面
      // 如果是新用户，跳转到设置页面设置密码
      if(res.data.message === '注册成功') {
        useUserStore().isNewUser = true
        router.push('/setting/account')
      }
      // 储存token等信息
      useUserStore().token = res.data.token
      useUserStore().isLogin = true
      // 重要：保存用户手机号
      useUserStore().userPhone = userPhone.value
    }
  }

</script>

<template>
  <div class="loginBoxBodyLeft">
    <h3 style="color: rgba(0, 0, 0, .8); font-weight: 500; padding-bottom: 10px;">验证码登陆/注册</h3>
    <div class="inputPhoneBox">
      <div class="inputPhoneLeft">
        +86
      </div>
      <div class="inputPhoneRight">
        <input type="text" placeholder="请输入手机号" class="inputPhone" v-model="userPhone">
      </div>
    </div>
    <div class="inputCaptchaBox"> 
      <div class="inputCaptchaLeft">
        <input type="text" placeholder="请输入验证码" class="inputCaptcha" v-model="captcha">
      </div>
      <button class="getCaptcha" @click="handleGetCaptcha" :disabled="countdown>0">{{ countdown>0 ? `${countdown}s后重试` : "获取验证码" }}</button>
    </div>
    <div class="loginConfirmBox">
      <button class="confirmLogin" @click="handleLogin">登录/注册</button>
      <!-- 没有添加错误提示 -->
    </div>
    <div class="otherLoginBox">
        <p style="color: rgba(0, 0, 0, .8); ">其他登陆:</p>
        <ul class="otherLoginList">
          <li v-for="item in otherLoginList" :key="item.name">
              <i class="iconfont" :class="item.icon" :style="{color: item.color}"></i>
          </li>
        </ul>
        <div class="changeLoginMethod" @click="change">密码登录</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
  .loginBoxBodyLeft {
    width: 330px;
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    
    // 手机号输入框
    .inputPhoneBox {
      height: 2.5rem;
      width: 100%;
      display: flex;
      align-items: center;
      background-color: rgba(93, 87, 87, 0.1);
      border-radius: 5px;
      overflow: hidden;
      margin-bottom: 20px;
      .inputPhoneLeft {
        display: flex;
        align-items: center;
        padding-left: 10px;
      }
      .inputPhoneRight {
        display: flex;
        align-items: center;
        padding-left: 10px;
        flex: 1;
        height: 100%;
        input {
          padding: 10px;
          border-radius: 5px;
          width: 100%;
          height: 100%;
          background-color: rgba(93, 87, 87, 0);
        }
      }
    }
    // 验证码输入框
    .inputCaptchaBox {
      width: 100%;
      height: 2.5rem;
      border-radius: 5px;
      overflow: hidden;
      display: flex;
      align-items: center;
      background-color: rgba(93, 87, 87, 0.1);
      margin-bottom: 20px;
      .inputCaptchaLeft {
        height: 100%;
          flex: 1;
        input {
          width: 100%;
          padding: 10px;
          border-radius: 5px;
          height: 100%;
          background-color: rgba(93, 87, 87, 0); 
        }
      }
      .getCaptcha {
        height: 100%;
        padding-right: 10px;
        color: $primaryColor;
      }
    }
    .loginConfirmBox {
        width: 100%;
        height: 40px;
        margin-bottom: 20px;
        background-color: $primaryColor;
        display: flex;
        align-items: center;
        .confirmLogin {
          width: 100%;
          height: 100%;
          background-color: $primaryColor;
          color: white;
        }
    }
    .otherLoginBox {
        flex: 1;
        display: flex;
        position: relative;
        align-items: center;
        font-size: .9rem;
       .otherLoginList {
        height: 100%;
        width: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
        li {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          .iconfont {
            font-size: 1.2rem;
          }
        }
       }
       .changeLoginMethod {
          color: $primaryColor;
          position: absolute;
          right: 0;
          cursor: pointer;
       }
    }
  }
</style>