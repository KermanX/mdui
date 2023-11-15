import { html, LitElement } from 'lit';
import {
  customElement,
  property,
  queryAssignedElements,
} from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { createRef, ref } from 'lit/directives/ref.js';
import { when } from 'lit/directives/when.js';
import { DefinedController } from '@mdui/shared/controllers/defined.js';
import { HasSlotController } from '@mdui/shared/controllers/has-slot.js';
import { watch } from '@mdui/shared/decorators/watch.js';
import { animateTo, stopAnimations } from '@mdui/shared/helpers/animate.js';
import { booleanConverter } from '@mdui/shared/helpers/decorator.js';
import { emit } from '@mdui/shared/helpers/event.js';
import { Modal } from '@mdui/shared/helpers/modal.js';
import { getDuration, getEasing } from '@mdui/shared/helpers/motion.js';
import { lockScreen, unlockScreen } from '@mdui/shared/helpers/scroll.js';
import { nothingTemplate } from '@mdui/shared/helpers/template.js';
import { componentStyle } from '@mdui/shared/lit-styles/component-style.js';
import '../icon.js';
import { style } from './style.js';
import type { TopAppBar } from '../top-app-bar/top-app-bar.js';
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit';
import type { Ref } from 'lit/directives/ref.js';

/**
 * @summary 对话框组件
 *
 * ```html
 * <mdui-dialog>content</mdui-dialog>
 * ```
 *
 * @event open - 在对话框打开之前触发。可以通过调用 `event.preventDefault()` 阻止对话框打开
 * @event opened - 在对话框打开之后触发
 * @event close - 在对话框关闭之前触发。可以通过调用 `event.preventDefault()` 阻止对话框关闭
 * @event closed - 在对话框关闭之后触发
 * @event overlay-click - 点击遮罩层时触发
 *
 * @slot header - 顶部元素，默认包含 `icon` slot 和 `headline` slot
 * @slot icon - 顶部图标
 * @slot headline - 顶部标题
 * @slot description - 标题下方的文本
 * @slot - 对话框主体内容
 * @slot action - 底部操作栏中的元素
 *
 * @csspart overlay - 遮罩层
 * @csspart panel - 对话框容器
 * @csspart header - 对话框 header 部分，其中包含了 icon 和 headline
 * @csspart icon - 顶部的图标，位于 header 中
 * @csspart headline - 顶部的标题，位于 header 中
 * @csspart body - 对话框的 body 部分
 * @csspart description - 副文本部分，位于 body 中
 * @csspart action - 底部操作按钮
 *
 * @cssprop --shape-corner - 组件的圆角大小。可以指定一个具体的像素值；但更推荐[引用设计令牌](/docs/2/styles/design-tokens#shape-corner)
 * @cssprop --z-index - 组件的 CSS 的 `z-index` 值
 */
@customElement('mdui-dialog')
export class Dialog extends LitElement {
  public static override styles: CSSResultGroup = [componentStyle, style];

  /**
   * 顶部的 Material Icons 图标名。也可以通过 `slot="icon"` 设置
   */
  @property({ reflect: true })
  public icon?: string;

  /**
   * 标题。也可以通过 `slot="headline"` 设置
   */
  @property({ reflect: true })
  public headline?: string;

  /**
   * 标题下方的文本。也可以通过 `slot="description"` 设置
   */
  @property({ reflect: true })
  public description?: string;

  /**
   * 是否打开对话框
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
  })
  public open = false;

  /**
   * 是否为全屏对话框
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
  })
  public fullscreen = false;

  /**
   * 是否在按下 ESC 键时，关闭对话框
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
    attribute: 'close-on-esc',
  })
  public closeOnEsc = false;

  /**
   * 是否在点击遮罩时，关闭对话框
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
    attribute: 'close-on-overlay-click',
  })
  public closeOnOverlayClick = false;

  /**
   * 是否垂直排列底部操作按钮
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
    attribute: 'stacked-actions',
  })
  public stackedActions = false;

  /**
   * 是否可拖拽移动位置
   */
  /* @property({
    type: Boolean,
    reflect: true,
    converter: (value: string | null): boolean =>
      value !== null && value !== 'false',
  })
  public draggable = false; */

  /**
   * 是否可拖拽改变大小
   */
  /* @property({
    type: Boolean,
    reflect: true,
    converter: (value: string | null): boolean =>
      value !== null && value !== 'false',
  })
  public resizable = false; */

  /**
   * dialog 组件内包含的 mdui-top-app-bar 组件
   */
  @queryAssignedElements({
    slot: 'header',
    selector: 'mdui-top-app-bar',
    flatten: true,
  })
  private readonly topAppBarElements!: TopAppBar[];

  // 用于在打开对话框前，记录当前聚焦的元素；在关闭对话框后，把焦点还原到该元素上
  private originalTrigger!: HTMLElement;

  private modalHelper!: Modal;
  private readonly overlayRef: Ref<HTMLElement> = createRef();
  private readonly panelRef: Ref<HTMLElement> = createRef();
  private readonly bodyRef: Ref<HTMLElement> = createRef();
  private readonly hasSlotController = new HasSlotController(
    this,
    'header',
    'icon',
    'headline',
    'description',
    'action',
    '[default]',
  );
  private readonly definedController = new DefinedController(this, {
    relatedElements: ['mdui-top-app-bar'],
  });

  @watch('open')
  private async onOpenChange() {
    const hasUpdated = this.hasUpdated;

    // 默认为关闭状态。因此首次渲染时，且为关闭状态，不执行
    if (!this.open && !hasUpdated) {
      return;
    }

    await this.definedController.whenDefined();

    if (!hasUpdated) {
      await this.updateComplete;
    }

    // 内部的 header, body, actions 元素
    const children = Array.from(
      this.panelRef.value!.querySelectorAll<HTMLElement>(
        '.header, .body, .actions',
      ),
    );

    const easingLinear = getEasing(this, 'linear');
    const easingEmphasizedDecelerate = getEasing(this, 'emphasized-decelerate');
    const easingEmphasizedAccelerate = getEasing(this, 'emphasized-accelerate');

    const stopAnimation = () =>
      Promise.all([
        stopAnimations(this.overlayRef.value!),
        stopAnimations(this.panelRef.value!),
        ...children.map((child) => stopAnimations(child)),
      ]);

    // 打开
    // 要区分是否首次渲染，首次渲染不触发事件，不执行动画；非首次渲染，触发事件，执行动画
    if (this.open) {
      if (hasUpdated) {
        const requestOpen = emit(this, 'open', {
          cancelable: true,
        });
        if (requestOpen.defaultPrevented) {
          return;
        }
      }

      this.style.display = 'flex';

      // 包含 <mdui-top-app-bar slot="header"> 时
      const topAppBarElements = this.topAppBarElements ?? [];
      if (topAppBarElements.length) {
        const topAppBarElement = topAppBarElements[0];

        // top-app-bar 未设置 scrollTarget 时，默认设置为 bodyRef
        if (!topAppBarElement.scrollTarget) {
          topAppBarElement.scrollTarget = this.bodyRef.value;
        }

        // 移除 header 和 body 之间的 margin
        this.bodyRef.value!.style.marginTop = '0';
      }

      this.originalTrigger = document.activeElement as HTMLElement;
      this.modalHelper.activate();
      lockScreen(this);

      await stopAnimation();

      // 设置聚焦
      requestAnimationFrame(() => {
        const autoFocusTarget = this.querySelector(
          '[autofocus]',
        ) as HTMLInputElement;
        if (autoFocusTarget) {
          autoFocusTarget.focus({ preventScroll: true });
        } else {
          this.panelRef.value!.focus({ preventScroll: true });
        }
      });

      const duration = getDuration(this, 'medium4');

      await Promise.all([
        animateTo(
          this.overlayRef.value!,
          [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 1 }],
          {
            duration: hasUpdated ? duration : 0,
            easing: easingLinear,
          },
        ),
        animateTo(
          this.panelRef.value!,
          [
            { transform: 'translateY(-1.875rem) scaleY(0)' },
            { transform: 'translateY(0) scaleY(1)' },
          ],
          {
            duration: hasUpdated ? duration : 0,
            easing: easingEmphasizedDecelerate,
          },
        ),
        animateTo(
          this.panelRef.value!,
          [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1 }],
          {
            duration: hasUpdated ? duration : 0,
            easing: easingLinear,
          },
        ),
        ...children.map((child) =>
          animateTo(
            child,
            [
              { opacity: 0 },
              { opacity: 0, offset: 0.2 },
              { opacity: 1, offset: 0.8 },
              { opacity: 1 },
            ],
            {
              duration: hasUpdated ? duration : 0,
              easing: easingLinear,
            },
          ),
        ),
      ]);

      if (hasUpdated) {
        emit(this, 'opened');
      }
    } else {
      const requestClose = emit(this, 'close', {
        cancelable: true,
      });
      if (requestClose.defaultPrevented) {
        return;
      }

      this.modalHelper.deactivate();
      await stopAnimation();

      const duration = getDuration(this, 'short4');

      await Promise.all([
        animateTo(this.overlayRef.value!, [{ opacity: 1 }, { opacity: 0 }], {
          duration,
          easing: easingLinear,
        }),
        animateTo(
          this.panelRef.value!,
          [
            { transform: 'translateY(0) scaleY(1)' },
            { transform: 'translateY(-1.875rem) scaleY(0.6)' },
          ],
          { duration, easing: easingEmphasizedAccelerate },
        ),
        animateTo(
          this.panelRef.value!,
          [{ opacity: 1 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }],
          { duration, easing: easingLinear },
        ),
        ...children.map((child) =>
          animateTo(
            child,
            [{ opacity: 1 }, { opacity: 0, offset: 0.75 }, { opacity: 0 }],
            { duration, easing: easingLinear },
          ),
        ),
      ]);

      this.style.display = 'none';
      unlockScreen(this);

      // 对话框关闭后，恢复焦点到原有的元素上
      const trigger = this.originalTrigger;
      if (typeof trigger?.focus === 'function') {
        setTimeout(() => trigger.focus());
      }

      emit(this, 'closed');
    }
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    unlockScreen(this);
  }

  protected override firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);

    this.modalHelper = new Modal(this);

    this.addEventListener('keydown', (event: KeyboardEvent) => {
      if (this.open && this.closeOnEsc && event.key === 'Escape') {
        event.stopPropagation();
        this.open = false;
      }
    });
  }

  protected override render(): TemplateResult {
    const hasActionSlot = this.hasSlotController.test('action');
    const hasDefaultSlot = this.hasSlotController.test('[default]');

    const hasIcon = !!this.icon || this.hasSlotController.test('icon');
    const hasHeadline =
      !!this.headline || this.hasSlotController.test('headline');
    const hasDescription =
      !!this.description || this.hasSlotController.test('description');
    const hasHeader =
      hasIcon || hasHeadline || this.hasSlotController.test('header');
    const hasBody = hasDescription || hasDefaultSlot;

    return html`<div
        ${ref(this.overlayRef)}
        part="overlay"
        class="overlay"
        @click=${this.onOverlayClick}
        tabindex="-1"
      ></div>
      <div
        ${ref(this.panelRef)}
        part="panel"
        class="panel ${classMap({
          'has-icon': hasIcon,
          'has-description': hasDescription,
          'has-default': hasDefaultSlot,
        })}"
        tabindex="0"
      >
        ${when(
          hasHeader,
          () =>
            html`<slot name="header" part="header" class="header">
              ${when(hasIcon, () => this.renderIcon())}
              ${when(hasHeadline, () => this.renderHeadline())}
            </slot>`,
        )}
        ${when(
          hasBody,
          () =>
            html`<div ${ref(this.bodyRef)} part="body" class="body">
              ${when(hasDescription, () => this.renderDescription())}
              <slot></slot>
            </div>`,
        )}
        ${when(
          hasActionSlot,
          () => html`<slot name="action" part="action" class="action"></slot>`,
        )}
      </div>`;
  }

  private onOverlayClick() {
    emit(this, 'overlay-click');
    if (!this.closeOnOverlayClick) {
      return;
    }

    this.open = false;
  }

  private renderIcon(): TemplateResult {
    return html`<slot name="icon" part="icon" class="icon">
      ${this.icon
        ? html`<mdui-icon name=${this.icon}></mdui-icon>`
        : nothingTemplate}
    </slot>`;
  }

  private renderHeadline(): TemplateResult {
    return html`<slot name="headline" part="headline" class="headline">
      ${this.headline}
    </slot>`;
  }

  private renderDescription(): TemplateResult {
    return html`<slot name="description" part="description" class="description">
      ${this.description}
    </slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mdui-dialog': Dialog;
  }
}
