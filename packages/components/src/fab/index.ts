import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { createRef, ref } from 'lit/directives/ref.js';
import cc from 'classcat';
import { HasSlotController } from '@mdui/shared/controllers/has-slot.js';
import { watch } from '@mdui/shared/decorators/watch.js';
import { booleanConverter } from '@mdui/shared/helpers/decorator.js';
import { delay } from '@mdui/shared/helpers/delay.js';
import { nothingTemplate } from '@mdui/shared/helpers/template.js';
import { ButtonBase } from '../button/button-base.js';
import '../icon.js';
import { style } from './style.js';
import type { MaterialIconsName } from '../icon.js';
import type { Ripple } from '../ripple/index.js';
import type { TemplateResult, CSSResultGroup } from 'lit';
import type { Ref } from 'lit/directives/ref.js';

/**
 * @event click - 点击时触发
 * @event focus - 获得焦点时触发
 * @event blur - 失去焦点时触发
 *
 * @slot - 文本
 * @slot icon - 图标
 *
 * @csspart button - 内部的 button 或 a 元素
 * @csspart label - 文本
 * @csspart icon - 图标
 * @csspart loading - 加载中动画
 *
 * @cssprop --shape-corner-small `size="small"` 时的圆角大小。可以指定一个具体的像素值；但更推荐[引用系统变量]()
 * @cssprop --shape-corner-normal `size="normal"` 时的圆角大小。可以指定一个具体的像素值；但更推荐[引用系统变量]()
 * @cssprop --shape-corner-large `size="large"` 时的圆角大小。可以指定一个具体的像素值；但更推荐[引用系统变量]()
 */
@customElement('mdui-fab')
export class Fab extends ButtonBase {
  public static override styles: CSSResultGroup = [ButtonBase.styles, style];

  /**
   * fab 形状。可选值为：
   * * `primary`
   * * `surface`
   * * `secondary`
   * * `tertiary`
   */
  @property({ reflect: true })
  public variant:
    | 'primary' /*预览图*/
    | 'surface' /*预览图*/
    | 'secondary' /*预览图*/
    | 'tertiary' /*预览图*/ = 'primary';

  /**
   * fab 大小。可选值为：
   * * `normal`
   * * `small`
   * * `large`
   */
  @property({ reflect: true })
  public size: 'normal' /*普通大小*/ | 'small' /*小型*/ | 'large' /*大型*/ =
    'normal';

  /**
   * Material Icons 图标名
   */
  @property({ reflect: true })
  public icon?: MaterialIconsName;

  /**
   * 是否为展开状态
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
  })
  public extended = false;

  private readonly rippleRef: Ref<Ripple> = createRef();
  private readonly hasSlotController = new HasSlotController(this, 'icon');

  protected override get rippleElement() {
    return this.rippleRef.value!;
  }

  /**
   * extended 变更时，设置动画
   */
  @watch('extended')
  private async onExtendedChange() {
    const hasUpdated = this.hasUpdated;

    if (!this.extended) {
      this.style.width = '';
    } else {
      this.style.width = `${this.scrollWidth}px`;
    }

    await this.updateComplete;

    if (this.extended && !hasUpdated) {
      await delay();
      this.style.width = `${this.scrollWidth}px`;
    }

    if (!hasUpdated) {
      // 延迟设置动画，避免首次渲染时也执行动画
      await delay();
      this.style.transitionProperty = 'box-shadow, width, bottom, transform'; // bottom, transform 在 bottom-app-bar 中用到
    }
  }

  protected override render(): TemplateResult {
    const hasIconSlot = this.hasSlotController.test('icon');
    const className = cc({
      button: true,
      'has-icon': this.icon || hasIconSlot,
    });

    return html`<mdui-ripple
        ${ref(this.rippleRef)}
        .noRipple=${this.noRipple}
      ></mdui-ripple>
      ${this.isButton()
        ? this.renderButton({
            className,
            part: 'button',
            content: this.renderInner(),
          })
        : this.disabled || this.loading
        ? html`<span part="button" class="_a ${className}">
            ${this.renderInner()}
          </span>`
        : this.renderAnchor({
            className,
            part: 'button',
            content: this.renderInner(),
          })}`;
  }

  private renderLabel(): TemplateResult {
    return html`<span part="label" class="label"><slot></slot></span>`;
  }

  private renderIcon(): TemplateResult {
    if (this.loading) {
      return this.renderLoading();
    }

    return html`<slot name="icon">
      ${this.icon
        ? html`<mdui-icon
            part="icon"
            class="icon"
            name=${this.icon}
          ></mdui-icon>`
        : nothingTemplate}
    </slot>`;
  }

  private renderInner(): TemplateResult[] {
    return [this.renderIcon(), this.renderLabel()];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mdui-fab': Fab;
  }
}
