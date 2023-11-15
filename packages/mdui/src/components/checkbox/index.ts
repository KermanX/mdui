import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { live } from 'lit/directives/live.js';
import { createRef, ref } from 'lit/directives/ref.js';
import { FormController, formResets } from '@mdui/shared/controllers/form.js';
import { defaultValue } from '@mdui/shared/decorators/default-value.js';
import { watch } from '@mdui/shared/decorators/watch.js';
import { booleanConverter } from '@mdui/shared/helpers/decorator.js';
import { emit } from '@mdui/shared/helpers/event.js';
import '@mdui/shared/icons/check-box-outline-blank.js';
import '@mdui/shared/icons/check-box.js';
import '@mdui/shared/icons/indeterminate-check-box.js';
import { componentStyle } from '@mdui/shared/lit-styles/component-style.js';
import { FocusableMixin } from '@mdui/shared/mixins/focusable.js';
import '../icon.js';
import { RippleMixin } from '../ripple/ripple-mixin.js';
import { style } from './style.js';
import type { Ripple } from '../ripple/index.js';
import type { FormControl } from '@mdui/jq/shared/form.js';
import type { TemplateResult, CSSResultGroup } from 'lit';
import type { Ref } from 'lit/directives/ref.js';

/**
 * @summary 复选框组件
 *
 * ```html
 * <mdui-checkbox>Checkbox</mdui-checkbox>
 * ```
 *
 * @event focus - 获得焦点时触发
 * @event blur - 失去焦点时触发
 * @event change - 选中状态变更时触发
 * @event input - 选中状态变更时触发
 * @event invalid - 表单字段验证未通过时触发
 *
 * @slot - 文本
 * @slot unchecked-icon - 未选中状态图标
 * @slot checked-icon - 选中状态图标
 * @slot indeterminate-icon - 不确定状态图标
 *
 * @csspart control - 左侧图标容器
 * @csspart unchecked-icon - 未选中状态图标
 * @csspart checked-icon - 选中状态图标
 * @csspart indeterminate-icon - 不确定状态图标
 * @csspart label - 文本
 */
@customElement('mdui-checkbox')
export class Checkbox
  extends RippleMixin(FocusableMixin(LitElement))
  implements FormControl
{
  public static override styles: CSSResultGroup = [componentStyle, style];

  /**
   * 是否为禁用状态
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
  })
  public disabled = false;

  /**
   * 是否为选中状态
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
  })
  public checked = false;

  /**
   * 默认选中状态。在重置表单时，将重置为该默认状态。该属性只能通过 JavaScript 属性设置
   */
  @defaultValue('checked')
  public defaultChecked = false;

  /**
   * 是否为不确定状态
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
  })
  public indeterminate = false;

  /**
   * 提交表单时，是否必须选中该复选框
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
  })
  public required = false;

  /**
   * 关联的 `form` 元素。此属性值必须为同一页面中的一个 `<form>` 元素的 `id` 属性。
   *
   * 如果此属性未指定，则元素必须是 `form` 元素的后代。利用此属性，你可以将元素放置在页面中的任何位置，而不仅仅是作为 `form` 元素的后代。
   */
  @property({ reflect: true })
  public form?: string;

  /**
   * 复选框名称，将与表单数据一起提交
   */
  @property({ reflect: true })
  public name = '';

  /**
   * 复选框的值，将于表单数据一起提交
   */
  @property({ reflect: true })
  public value = 'on';

  /**
   * 未选中状态的 Material Icons 图标名。也可以通过 `slot="unchecked-icon"` 设置
   */
  @property({ reflect: true, attribute: 'unchecked-icon' })
  public uncheckedIcon?: string;

  /**
   * 选中状态的 Material Icons 图标名。也可以通过 `slot="checked-icon"` 设置
   */
  @property({ reflect: true, attribute: 'checked-icon' })
  public checkedIcon?: string;

  /**
   * 不确定状态的 Material Icons 图标名。也可以通过 `slot="indeterminate-icon"` 设置
   */
  @property({ reflect: true, attribute: 'indeterminate-icon' })
  public indeterminateIcon?: string;

  /**
   * 是否验证未通过
   */
  @state()
  private invalid = false;

  private readonly inputRef: Ref<HTMLInputElement> = createRef();
  private readonly rippleRef: Ref<Ripple> = createRef();
  private readonly formController = new FormController(this, {
    value: (control) => (control.checked ? control.value : undefined),
    defaultValue: (control) => control.defaultChecked!,
    setValue: (control, checked) => (control.checked = checked as boolean),
  });

  /**
   * 表单验证状态对象
   */
  public get validity(): ValidityState {
    return this.inputRef.value!.validity;
  }

  /**
   * 表单验证的错误提示信息
   */
  public get validationMessage(): string {
    return this.inputRef.value!.validationMessage;
  }

  protected override get rippleElement() {
    return this.rippleRef.value!;
  }

  protected override get rippleDisabled(): boolean {
    return this.disabled;
  }

  protected override get focusElement(): HTMLElement | undefined {
    return this.inputRef.value;
  }

  protected override get focusDisabled(): boolean {
    return this.disabled;
  }

  @watch('disabled', true)
  @watch('indeterminate', true)
  @watch('required', true)
  private async onDisabledChange() {
    await this.updateComplete;
    this.invalid = !this.inputRef.value!.checkValidity();
  }

  @watch('checked', true)
  private async onCheckedChange() {
    await this.updateComplete;

    // reset 引起的值变更，不执行验证；直接修改值引起的变更，需要进行验证
    const form = this.formController.getForm();
    if (form && formResets.get(form)?.has(this)) {
      this.invalid = false;
      formResets.get(form)!.delete(this);
    } else {
      this.invalid = !this.inputRef.value!.checkValidity();
    }
  }

  /**
   * 检查表单字段是否验证通过。若未通过则返回 `false`，并触发 `invalid` 事件；若验证通过，则返回 `true`
   */
  public checkValidity(): boolean {
    const valid = this.inputRef.value!.checkValidity();

    if (!valid) {
      emit(this, 'invalid', {
        bubbles: false,
        cancelable: true,
        composed: false,
      });
    }

    return valid;
  }

  /**
   * 检查表单字段是否验证通过。若未通过则返回 `false`，并触发 `invalid` 事件；若验证通过，则返回 `true`。
   *
   * 验证未通过时，还将在组件上显示未通过的提示。
   */
  public reportValidity(): boolean {
    this.invalid = !this.inputRef.value!.reportValidity();

    if (this.invalid) {
      const requestInvalid = emit(this, 'invalid', {
        bubbles: false,
        cancelable: true,
        composed: false,
      });

      // 调用了 preventDefault() 时，隐藏默认的表单错误提示
      if (requestInvalid.defaultPrevented) {
        this.blur();
        this.focus();
      }
    }

    return !this.invalid;
  }

  /**
   * 设置自定义的错误提示文本。只要文本不为空，则表示字段验证未通过
   *
   * @param message 自定义的提示文本
   */
  public setCustomValidity(message: string): void {
    this.inputRef.value!.setCustomValidity(message);
    this.invalid = !this.inputRef.value!.checkValidity();
  }

  protected override render(): TemplateResult {
    return html`<label class="${classMap({ invalid: this.invalid })}">
      <input
        ${ref(this.inputRef)}
        type="checkbox"
        name=${ifDefined(this.name)}
        value=${ifDefined(this.value)}
        .indeterminate=${live(this.indeterminate)}
        .disabled=${this.disabled}
        .checked=${live(this.checked)}
        .required=${this.required}
        @change=${this.onChange}
      />
      <i part="control">
        <mdui-ripple
          ${ref(this.rippleRef)}
          .noRipple=${this.noRipple}
        ></mdui-ripple>
        <slot
          name="unchecked-icon"
          part="unchecked-icon"
          class="icon unchecked-icon"
        >
          ${this.uncheckedIcon
            ? html`<mdui-icon name=${this.uncheckedIcon} class="i"></mdui-icon>`
            : html`<mdui-icon-check-box-outline-blank
                class="i"
              ></mdui-icon-check-box-outline-blank>`}
        </slot>
        <slot name="checked-icon" part="checked-icon" class="icon checked-icon">
          ${this.checkedIcon
            ? html`<mdui-icon name=${this.checkedIcon} class="i"></mdui-icon>`
            : html`<mdui-icon-check-box class="i"></mdui-icon-check-box>`}
        </slot>
        <slot
          name="indeterminate-icon"
          part="indeterminate-icon"
          class="icon indeterminate-icon"
        >
          ${this.indeterminateIcon
            ? html`<mdui-icon
                name=${this.indeterminateIcon}
                class="i"
              ></mdui-icon>`
            : html`<mdui-icon-indeterminate-check-box
                class="i"
              ></mdui-icon-indeterminate-check-box>`}
        </slot>
      </i>
      <slot part="label" class="label"></slot>
    </label>`;
  }

  /**
   * input[type="checkbox"] 的 change 事件无法冒泡越过 shadow dom
   */
  private onChange() {
    this.checked = this.inputRef.value!.checked;
    this.indeterminate = false;
    emit(this, 'change');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mdui-checkbox': Checkbox;
  }
}
