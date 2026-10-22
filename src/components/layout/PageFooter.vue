<template>
  <footer class="page-footer">
    <!-- 左侧：logo + 文字 -->
    <div class="footer-brand">
      <RiTargetLine class="tool-logo" size="20" />
      <span class="footer-brand-text">回旋标工具系列</span>
    </div>

    <!-- 居中：2 个图标 -->
    <div class="footer-actions">
      <div class="footer-icon-wrap">
        <div class="footer-icon-btn" @click="showCreditModal = true">
          <RiShieldCheckLine class="footer-mark" size="14" />
        </div>
        <span class="footer-tip">企业信用</span>
      </div>
      <div class="footer-icon-wrap">
        <div class="footer-icon-btn" @click="showBiddingModal = true">
          <RiLinksLine class="footer-mark" size="14" />
        </div>
        <span class="footer-tip">招标网站</span>
      </div>
    </div>

    <!-- 右侧：版权 -->
    <span class="footer-copy">© {{ year }} {{ BRAND_NAME }} · Powered by <a href="https://lazycat.cloud/" target="_blank" rel="noopener noreferrer" class="footer-link">LightOS</a></span>

    <!-- 企业信用弹窗 -->
    <CreditQualificationModal v-model:visible="showCreditModal" />

    <!-- 招标网站弹窗 -->
    <BiddingSitesModal v-model:visible="showBiddingModal" />
  </footer>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { RiTargetLine, RiShieldCheckLine, RiLinksLine, RiCloseLine } from '@remixicon/vue';
import { BRAND_NAME } from '../../constants/brand';
import CreditQualificationModal from './CreditQualificationModal.vue';
import BiddingSitesModal from './BiddingSitesModal.vue';

const year = ref(new Date().getFullYear())
const showCreditModal = ref(false)
const showBiddingModal = ref(false)

onMounted(() => { year.value = new Date().getFullYear() })
</script>

<style scoped>
.page-footer {
  height: 58px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  background: linear-gradient(180deg, var(--color-bg-white, #FFFFFF) 0%, var(--color-bg-secondary, #F7F3EA) 100%);
  border-top: 1px solid var(--color-border-soft, #EDE9E0);
}

/* 左侧 logo + 文字 */
.footer-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tool-logo {
  font-family: "remixicon", sans-serif;
  font-style: normal;
  line-height: 1;
  color: var(--color-primary, var(--color-cinnabar, #C0392B));
  flex-shrink: 0;
}
.footer-brand-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-body, var(--color-brown, #3A3A3A));
  font-family: var(--font-ui);
  white-space: nowrap;
}

/* 居中图标组 */
.footer-actions {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.footer-icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.footer-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: var(--color-bg-white, #FFFFFF);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-secondary, var(--color-brown-muted, #6E6A60));
  transition: background-color 0.25s ease, color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
}
.footer-icon-btn:hover {
  background-color: var(--color-primary, var(--color-cinnabar, #C0392B));
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(192, 57, 43, 0.3);
}
.footer-mark {
  font-family: "remixicon", sans-serif;
  font-style: normal;
  color: inherit;
  transition: transform 0.25s ease;
}
.footer-tip {
  position: absolute;
  bottom: calc(100% + 9px);
  left: 50%;
  transform: translateX(-50%) scale(0.96);
  padding: 7px 12px;
  border-radius: 9px;
  background-color: var(--color-bg-white, #FFFFFF);
  border: 0.7px solid var(--color-border, #E5DFD3);
  color: var(--color-text-body, #3A3A3A);
  font-size: 12.5px;
  font-weight: 400;
  line-height: 1.5;
  font-family: var(--font-ui);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.16s ease, transform 0.16s ease;
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.12));
  z-index: 100;
}
.footer-tip::after {
  content: '';
  position: absolute;
  top: calc(100% - 4px);
  left: calc(50% - 3.5px);
  width: 7px;
  height: 7px;
  background-color: inherit;
  transform: rotate(45deg);
}
.footer-icon-wrap:hover .footer-tip {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}

/* 右侧版权 */
.footer-copy {
  font-size: 14px;
  color: var(--color-text-muted, var(--color-brown-muted, #8A8578));
  white-space: nowrap;
  font-family: var(--font-ui);
}
.footer-link {
  color: var(--color-primary, var(--color-cinnabar, #C0392B));
  text-decoration: none;
  transition: opacity 0.2s;
}
.footer-link:hover {
  opacity: 0.75;
  text-decoration: underline;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: var(--color-bg-white, #FFFFFF);
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 0.7px solid var(--color-border-soft, #EDE9E0);
}
.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary, #1F1D1A);
}
.modal-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-secondary, #6E6A60);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: background 0.2s;
}
.modal-close:hover {
  background: var(--color-bg-secondary, #F7F3EA);
}
.modal-body {
  padding: 24px;
  color: var(--color-text-body, #3A3A3A);
  font-size: 15px;
  line-height: 1.6;
}
.modal-body p {
  margin: 0;
}

@media (max-width: 768px) {
  .page-footer {
    padding: 0 16px;
    gap: 12px;
  }
  .footer-brand-text {
    display: none;
  }
}

@media (max-width: 480px) {
  .page-footer {
    padding: 0 10px;
    height: 44px;
  }
  .footer-copy {
    font-size: 11px;
  }
}
</style>
