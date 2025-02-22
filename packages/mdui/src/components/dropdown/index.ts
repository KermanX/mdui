import { html, LitElement } from 'lit';
import {
  customElement,
  property,
  queryAssignedElements,
} from 'lit/decorators.js';
import { createRef, ref } from 'lit/directives/ref.js';
import { $ } from '@mdui/jq/$.js';
import '@mdui/jq/methods/height.js';
import '@mdui/jq/methods/is.js';
import '@mdui/jq/methods/width.js';
import { isFunction } from '@mdui/jq/shared/helper.js';
import { DefinedController } from '@mdui/shared/controllers/defined.js';
import { watch } from '@mdui/shared/decorators/watch.js';
import { animateTo, stopAnimations } from '@mdui/shared/helpers/animate.js';
import { booleanConverter } from '@mdui/shared/helpers/decorator.js';
import { emit } from '@mdui/shared/helpers/event.js';
import { getDuration, getEasing } from '@mdui/shared/helpers/motion.js';
import { observeResize } from '@mdui/shared/helpers/observeResize.js';
import { componentStyle } from '@mdui/shared/lit-styles/component-style.js';
import { style } from './style.js';
import type { ObserveResize } from '@mdui/shared/helpers/observeResize.js';
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit';
import type { Ref } from 'lit/directives/ref.js';

/**
 * @summary 下拉组件
 *
 * ```html
 * <mdui-dropdown>
 * ..<mdui-button slot="trigger">open dropdown</mdui-button>
 * ..<mdui-menu>
 * ....<mdui-menu-item>Item 1</mdui-menu-item>
 * ....<mdui-menu-item>Item 2</mdui-menu-item>
 * ..</mdui-menu>
 * </mdui-dropdown>
 * ```
 *
 * @event open - dropdown 开始打开时，事件被触发。可以通过调用 `event.preventDefault()` 阻止 dropdown 打开
 * @event opened - dropdown 打开动画完成时，事件被触发
 * @event close - dropdown 开始关闭时，事件被触发。可以通过调用 `event.preventDefault()` 阻止 dropdown 关闭
 * @event closed - dropdown 关闭动画完成时，事件被触发
 *
 * @slot - dropdown 的内容
 * @slot trigger - 触发 dropdown 的元素，例如 [`<mdui-button>`](/docs/2/components/button) 元素
 *
 * @csspart trigger - 触发 dropdown 的元素的容器，即 `trigger` slot 的容器
 * @csspart panel - dropdown 内容的容器
 *
 * @cssprop --z-index - 组件的 CSS 的 `z-index` 值
 */
@customElement('mdui-dropdown')
export class Dropdown extends LitElement {
  public static override styles: CSSResultGroup = [componentStyle, style];

  /**
   * dropdown 是否打开
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
  })
  public open = false;

  /**
   * 是否禁用 dropdown
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
  })
  public disabled = false;

  /**
   * dropdown 的触发方式，支持传入多个值，用空格分隔。可选值为：
   *
   * * `click`：点击时触发
   * * `hover`：鼠标悬浮触发
   * * `focus`：聚焦时触发
   * * `contextmenu`：鼠标右键点击、或触摸长按时触发
   * * `manual`：使用了该值时，只能使用编程方式打开和关闭 dropdown，且不能再指定其他触发方式
   */
  @property({ reflect: true })
  public trigger:
    | /*点击时触发*/ 'click'
    | /*鼠标悬浮触发*/ 'hover'
    | /*聚焦时触发*/ 'focus'
    | /*鼠标右键点击、或触摸长按时触发*/ 'contextmenu'
    | /*使用了该值时，只能使用编程方式打开和关闭 dropdown，且不能再指定其他触发方式*/ 'manual'
    | string = 'click';

  /**
   * dropdown 内容的位置。可选值为：
   *
   * * `auto`：自动判断位置
   * * `top-start`：位于上方，且左对齐
   * * `top`：位于上方，且居中对齐
   * * `top-end`：位于上方，且右对齐
   * * `bottom-start`：位于下方，且左对齐
   * * `bottom`：位于下方，且居中对齐
   * * `bottom-end`：位于下方，且右对齐
   * * `left-start`：位于左侧，且顶部对齐
   * * `left`：位于左侧，且居中对齐
   * * `left-end`：位于左侧，且底部对齐
   * * `right-start`：位于右侧，且顶部对齐
   * * `right`：位于右侧，且居中对齐
   * * `right-end`：位于右侧，且底部对齐
   */
  @property({ reflect: true })
  public placement:
    | /*自动判断位置*/ 'auto'
    | /*位于上方，且左对齐*/ 'top-start'
    | /*位于上方，且居中对齐*/ 'top'
    | /*位于上方，且右对齐*/ 'top-end'
    | /*位于下方，且左对齐*/ 'bottom-start'
    | /*位于下方，且居中对齐*/ 'bottom'
    | /*位于下方，且右对齐*/ 'bottom-end'
    | /*位于左侧，且顶部对齐*/ 'left-start'
    | /*位于左侧，且居中对齐*/ 'left'
    | /*位于左侧，且底部对齐*/ 'left-end'
    | /*位于右侧，且顶部对齐*/ 'right-start'
    | /*位于右侧，且居中对齐*/ 'right'
    | /*位于右侧，且底部对齐*/ 'right-end' = 'auto';

  /**
   * 在点击 [`<mdui-menu-item>`](/docs/2/components/menu#menu-item-api) 元素后，是否仍保持 dropdown 为打开状态
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
    attribute: 'stay-open-on-click',
  })
  public stayOpenOnClick = false;

  /**
   * 通过 hover 触发 dropdown 打开时的延时，单位为毫秒
   */
  @property({ type: Number, reflect: true, attribute: 'open-delay' })
  public openDelay = 150;

  /**
   * 通过 hover 触发 dropdown 关闭时的延时，单位为毫秒
   */
  @property({ type: Number, reflect: true, attribute: 'close-delay' })
  public closeDelay = 150;

  /**
   * 是否在触发 dropdown 时的光标所在的位置打开 dropdown。通常用于在打开鼠标右键菜单时使用
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
    attribute: 'open-on-pointer',
  })
  public openOnPointer = false;

  // 触发 dropdown 的元素
  @queryAssignedElements({ slot: 'trigger', flatten: true })
  private readonly triggerElements!: HTMLElement[];

  // dropdown 的内容
  @queryAssignedElements({ flatten: true })
  private readonly panelElements!: HTMLElement[];

  // 右键菜单点击位置相对于 trigger 的位置
  private pointerOffsetX!: number;
  private pointerOffsetY!: number;

  // 打开动画的方向（横向、竖向）
  private animateDirection!: 'horizontal' | 'vertical';

  private openTimeout!: number;
  private closeTimeout!: number;

  private observeResize?: ObserveResize;
  private readonly panelRef: Ref<HTMLElement> = createRef();
  private readonly definedController = new DefinedController(this, {
    relatedElements: [''],
  });

  public constructor() {
    super();

    this.onDocumentClick = this.onDocumentClick.bind(this);
    this.onDocumentKeydown = this.onDocumentKeydown.bind(this);
    this.onWindowScroll = this.onWindowScroll.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onPanelClick = this.onPanelClick.bind(this);
  }

  private get triggerElement(): HTMLElement {
    return this.triggerElements[0];
  }

  // 这些属性变更时，需要更新样式
  @watch('placement', true)
  @watch('openOnPointer', true)
  private async onPositionChange() {
    // 如果是打开状态，则更新 panel 的位置
    if (this.open) {
      await this.definedController.whenDefined();
      this.updatePositioner();
    }
  }

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

    const easingLinear = getEasing(this, 'linear');
    const easingEmphasizedDecelerate = getEasing(this, 'emphasized-decelerate');
    const easingEmphasizedAccelerate = getEasing(this, 'emphasized-accelerate');

    // 打开
    // 要区分是否首次渲染，首次渲染时不触发事件，不执行动画；非首次渲染，触发事件，执行动画
    if (this.open) {
      if (hasUpdated) {
        const requestOpen = emit(this, 'open', {
          cancelable: true,
        });
        if (requestOpen.defaultPrevented) {
          return;
        }
      }

      // dropdown 打开时，尝试把焦点放到 panel 中
      const focusablePanel = this.panelElements.find((panel) =>
        isFunction(panel.focus),
      );
      setTimeout(() => {
        focusablePanel?.focus();
      });

      const duration = getDuration(this, 'medium4');

      await stopAnimations(this.panelRef.value!);
      this.panelRef.value!.hidden = false;
      this.updatePositioner();
      await Promise.all([
        animateTo(
          this.panelRef.value!,
          [
            { transform: `${this.getCssScaleName()}(0.45)` },
            { transform: `${this.getCssScaleName()}(1)` },
          ],
          {
            duration: hasUpdated ? duration : 0,
            easing: easingEmphasizedDecelerate,
          },
        ),
        animateTo(
          this.panelRef.value!,
          [{ opacity: 0 }, { opacity: 1, offset: 0.125 }, { opacity: 1 }],
          {
            duration: hasUpdated ? duration : 0,
            easing: easingLinear,
          },
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

      // dropdown 关闭时，如果不支持 focus 触发，且焦点在 dropdown 内，则焦点回到 trigger 上
      if (
        !this.hasTrigger('focus') &&
        isFunction(this.triggerElement?.focus) &&
        (this.contains(document.activeElement) ||
          this.contains(document.activeElement?.assignedSlot ?? null))
      ) {
        this.triggerElement.focus();
      }

      const duration = getDuration(this, 'short4');

      await stopAnimations(this.panelRef.value);
      await Promise.all([
        animateTo(
          this.panelRef.value,
          [
            { transform: `${this.getCssScaleName()}(1)` },
            { transform: `${this.getCssScaleName()}(0.45)` },
          ],
          { duration, easing: easingEmphasizedAccelerate },
        ),
        animateTo(
          this.panelRef.value,
          [{ opacity: 1 }, { opacity: 1, offset: 0.875 }, { opacity: 0 }],
          { duration, easing: easingLinear },
        ),
      ]);

      // 可能关闭 dropdown 时该元素已经不存在了（比如页面直接跳转了）
      if (this.panelRef.value) {
        this.panelRef.value.hidden = true;
      }

      emit(this, 'closed');
    }
  }

  public override connectedCallback(): void {
    super.connectedCallback();

    this.definedController.whenDefined().then(() => {
      document.addEventListener('pointerdown', this.onDocumentClick);
      document.addEventListener('keydown', this.onDocumentKeydown);
      window.addEventListener('scroll', this.onWindowScroll);
    });
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();

    document.removeEventListener('pointerdown', this.onDocumentClick);
    document.removeEventListener('keydown', this.onDocumentKeydown);
    window.removeEventListener('scroll', this.onWindowScroll);

    this.observeResize?.unobserve();
  }

  protected override firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);

    this.addEventListener('mouseleave', this.onMouseLeave);

    this.definedController.whenDefined().then(() => {
      this.triggerElement.addEventListener('focus', this.onFocus);
      this.triggerElement.addEventListener('click', this.onClick);
      this.triggerElement.addEventListener('contextmenu', this.onContextMenu);
      this.triggerElement.addEventListener('mouseenter', this.onMouseEnter);

      // triggerElement 的尺寸变化时，重新调整 panel 的位置
      this.observeResize = observeResize(this.triggerElement, () => {
        this.updatePositioner();
      });
    });
  }

  protected override render(): TemplateResult {
    return html`<slot name="trigger" part="trigger" class="trigger"></slot>
      <slot
        ${ref(this.panelRef)}
        part="panel"
        class="panel"
        hidden
        @click=${this.onPanelClick}
      ></slot>`;
  }

  /**
   * 获取 dropdown 打开、关闭动画的 CSS scaleX 或 scaleY
   */
  private getCssScaleName() {
    return this.animateDirection === 'horizontal' ? 'scaleX' : 'scaleY';
  }

  /**
   * 在 document 上点击时，根据条件判断是否要关闭 dropdown
   */
  private onDocumentClick(e: MouseEvent) {
    if (this.disabled || !this.open) {
      return;
    }

    const path = e.composedPath();

    // 点击 dropdown 外部区域，直接关闭
    if (!path.includes(this)) {
      this.open = false;
    }

    // 当包含 contextmenu 且不包含 click 时，点击 trigger，关闭
    if (
      this.hasTrigger('contextmenu') &&
      !this.hasTrigger('click') &&
      path.includes(this.triggerElement)
    ) {
      this.open = false;
    }
  }

  /**
   * 在 document 上按下按键时，根据条件判断是否要关闭 dropdown
   */
  private onDocumentKeydown(event: KeyboardEvent) {
    if (this.disabled || !this.open) {
      return;
    }

    // 按下 ESC 键时，关闭 dropdown
    if (event.key === 'Escape') {
      this.open = false;
      return;
    }

    // 按下 Tab 键时，关闭 dropdown
    if (event.key === 'Tab') {
      // 如果不支持 focus 触发，则焦点回到 trigger 上（这个会在 onOpenChange 中执行 ）这里只需阻止默认的 Tab 行为
      if (!this.hasTrigger('focus') && isFunction(this.triggerElement?.focus)) {
        event.preventDefault();
      }

      this.open = false;
    }
  }

  private onWindowScroll() {
    window.requestAnimationFrame(() => this.onPositionChange());
  }

  private hasTrigger(
    trigger: 'click' | 'hover' | 'focus' | 'contextmenu' | 'manual',
  ): boolean {
    const triggers = this.trigger.split(' ');
    return triggers.includes(trigger);
  }

  private onFocus() {
    if (this.disabled || this.open || !this.hasTrigger('focus')) {
      return;
    }

    this.open = true;
  }

  private onClick(e: MouseEvent) {
    // e.button 为 0 时，为鼠标左键点击。忽略鼠标中间和右键
    if (this.disabled || e.button || !this.hasTrigger('click')) {
      return;
    }

    // 支持 hover 或 focus 触发时，点击时，不关闭 dropdown
    if (this.open && (this.hasTrigger('hover') || this.hasTrigger('focus'))) {
      return;
    }

    this.pointerOffsetX = e.offsetX;
    this.pointerOffsetY = e.offsetY;

    this.open = !this.open;
  }

  private onPanelClick(e: MouseEvent) {
    if (
      !this.disabled &&
      !this.stayOpenOnClick &&
      $(e.target!).is('mdui-menu-item')
    ) {
      this.open = false;
    }
  }

  private onContextMenu(e: MouseEvent) {
    if (this.disabled || !this.hasTrigger('contextmenu')) {
      return;
    }

    e.preventDefault();
    this.pointerOffsetX = e.offsetX;
    this.pointerOffsetY = e.offsetY;
    this.open = true;
  }

  private onMouseEnter() {
    // 不做 open 状态的判断，因为可以延时打开和关闭
    if (this.disabled || !this.hasTrigger('hover')) {
      return;
    }

    window.clearTimeout(this.closeTimeout);
    if (this.openDelay) {
      this.openTimeout = window.setTimeout(() => {
        this.open = true;
      }, this.openDelay);
    } else {
      this.open = true;
    }
  }

  private onMouseLeave() {
    // 不做 open 状态的判断，因为可以延时打开和关闭
    if (this.disabled || !this.hasTrigger('hover')) {
      return;
    }

    window.clearTimeout(this.openTimeout);
    this.closeTimeout = window.setTimeout(() => {
      this.open = false;
    }, this.closeDelay || 50);
  }

  // 更新 panel 的位置
  private updatePositioner(): void {
    const $panel = $(this.panelRef.value!);
    const $window = $(window);
    const panelElements = this.panelElements;
    const panelRect = {
      width: Math.max(
        ...(panelElements?.map((panel) => panel.offsetWidth) ?? []),
      ),
      height: panelElements
        ?.map((panel) => panel.offsetHeight)
        .reduce((total, height) => total + height, 0),
    };

    // 在光标位置触发时，假设 triggerElement 的宽高为 0，位置位于光标位置
    const triggerClientRect = this.triggerElement.getBoundingClientRect();
    const triggerRect = this.openOnPointer
      ? {
          top: this.pointerOffsetY + triggerClientRect.top,
          left: this.pointerOffsetX + triggerClientRect.left,
          width: 0,
          height: 0,
        }
      : triggerClientRect;

    // dropdown 与屏幕边界至少保留 8px 间距
    const screenMargin = 8;

    let transformOriginX: 'left' | 'right' | 'center';
    let transformOriginY: 'top' | 'bottom' | 'center';
    let top: number;
    let left: number;
    let placement = this.placement;

    // 自动判断 dropdown 的方位
    // 优先级为 bottom>top>right>left，start>center>end
    if (placement === 'auto') {
      const windowWidth = $window.width();
      const windowHeight = $window.height();
      let position: 'top' | 'bottom' | 'left' | 'right';
      let alignment: 'start' | 'end' | undefined;

      if (
        windowHeight - triggerRect.top - triggerRect.height >
        panelRect.height + screenMargin
      ) {
        // 下方放得下，放下方
        position = 'bottom';
      } else if (triggerRect.top > panelRect.height + screenMargin) {
        // 上方放得下，放上方
        position = 'top';
      } else if (
        windowWidth - triggerRect.left - triggerRect.width >
        panelRect.width + screenMargin
      ) {
        // 右侧放得下，放右侧
        position = 'right';
      } else if (triggerRect.left > panelRect.width + screenMargin) {
        // 左侧放得下，放左侧
        position = 'left';
      } else {
        // 默认放下方
        position = 'bottom';
      }

      if (['top', 'bottom'].includes(position)) {
        if (windowWidth - triggerRect.left > panelRect.width + screenMargin) {
          // 左对齐放得下，左对齐
          alignment = 'start';
        } else if (
          triggerRect.left + triggerRect.width / 2 >
            panelRect.width / 2 + screenMargin &&
          windowWidth - triggerRect.left - triggerRect.width / 2 >
            panelRect.width / 2 + screenMargin
        ) {
          // 居中对齐放得下，居中对齐
          alignment = undefined;
        } else if (
          triggerRect.left + triggerRect.width >
          panelRect.width + screenMargin
        ) {
          // 右对齐放得下，右对齐
          alignment = 'end';
        } else {
          // 默认左对齐
          alignment = 'start';
        }
      } else {
        if (windowHeight - triggerRect.top > panelRect.height + screenMargin) {
          // 顶部对齐放得下，顶部对齐
          alignment = 'start';
        } else if (
          triggerRect.top + triggerRect.height / 2 >
            panelRect.height / 2 + screenMargin &&
          windowHeight - triggerRect.top - triggerRect.height / 2 >
            panelRect.height / 2 + screenMargin
        ) {
          // 居中对齐放得下，居中对齐
          alignment = undefined;
        } else if (
          triggerRect.top + triggerRect.height >
          panelRect.height + screenMargin
        ) {
          // 底部对齐放得下，底部对齐
          alignment = 'end';
        } else {
          // 默认顶部对齐
          alignment = 'start';
        }
      }

      placement = alignment
        ? ([position, alignment].join('-') as typeof placement)
        : position;
    }

    // 根据 placement 计算 panel 的位置和方向
    const [position, alignment] = placement.split('-') as [
      'top' | 'bottom' | 'left' | 'right',
      'start' | 'end' | undefined,
    ];

    this.animateDirection = ['top', 'bottom'].includes(position)
      ? 'vertical'
      : 'horizontal';

    switch (position) {
      case 'top':
        transformOriginY = 'bottom';
        top = triggerRect.top - panelRect.height;
        break;
      case 'bottom':
        transformOriginY = 'top';
        top = triggerRect.top + triggerRect.height;
        break;
      default:
        transformOriginY = 'center';
        switch (alignment) {
          case 'start':
            top = triggerRect.top;
            break;
          case 'end':
            top = triggerRect.top + triggerRect.height - panelRect.height;
            break;
          default:
            top =
              triggerRect.top + triggerRect.height / 2 - panelRect.height / 2;
            break;
        }
        break;
    }

    switch (position) {
      case 'left':
        transformOriginX = 'right';
        left = triggerRect.left - panelRect.width;
        break;
      case 'right':
        transformOriginX = 'left';
        left = triggerRect.left + triggerRect.width;
        break;
      default:
        transformOriginX = 'center';
        switch (alignment) {
          case 'start':
            left = triggerRect.left;
            break;
          case 'end':
            left = triggerRect.left + triggerRect.width - panelRect.width;
            break;
          default:
            left =
              triggerRect.left + triggerRect.width / 2 - panelRect.width / 2;
            break;
        }
        break;
    }

    $panel.css({
      top,
      left,
      transformOrigin: [transformOriginX, transformOriginY].join(' '),
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mdui-dropdown': Dropdown;
  }
}
