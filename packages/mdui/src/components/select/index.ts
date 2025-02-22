import { html, LitElement, nothing, PropertyValues } from 'lit';
import {
  customElement,
  property,
  queryAssignedElements,
  state,
} from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { map } from 'lit/directives/map.js';
import { createRef, ref } from 'lit/directives/ref.js';
import { when } from 'lit/directives/when.js';
import { isString } from '@mdui/jq/shared/helper.js';
import { DefinedController } from '@mdui/shared/controllers/defined.js';
import { FormController, formResets } from '@mdui/shared/controllers/form.js';
import { HasSlotController } from '@mdui/shared/controllers/has-slot.js';
import { defaultValue } from '@mdui/shared/decorators/default-value.js';
import { booleanConverter } from '@mdui/shared/helpers/decorator.js';
import { emit } from '@mdui/shared/helpers/event.js';
import { observeResize } from '@mdui/shared/helpers/observeResize.js';
import { componentStyle } from '@mdui/shared/lit-styles/component-style.js';
import { FocusableMixin } from '@mdui/shared/mixins/focusable.js';
import '../chip.js';
import '../dropdown.js';
import '../menu.js';
import '../text-field.js';
import { style } from './style.js';
import type { MenuItem } from '../menu/menu-item.js';
import type { Menu } from '../menu/menu.js';
import type { TextField } from '../text-field.js';
import type { FormControl } from '@mdui/jq/shared/form.js';
import type { ObserveResize } from '@mdui/shared/helpers/observeResize.js';
import type { CSSResultGroup, TemplateResult } from 'lit';
import type { Ref } from 'lit/directives/ref.js';

/**
 * @summary 选择框组件。需与 `<mdui-menu-item>` 组件配合使用
 *
 * ```html
 * <mdui-select>
 * ..<mdui-menu-item value="item-1">Item 1</mdui-menu-item>
 * ..<mdui-menu-item value="item-2">Item 2</mdui-menu-item>
 * </mdui-select>
 * ```
 *
 * @event focus - 获得焦点时触发
 * @event blur - 失去焦点时触发
 * @event change - 选中的值变更时触发
 * @event invalid - 表单字段验证未通过时触发
 * @event clear - 在点击由 `clearable` 属性生成的清空按钮时触发。可以通过调用 `event.preventDefault()` 阻止清空下拉框
 *
 * @slot - `<mdui-menu-item>` 元素
 * @slot icon - 左侧图标
 * @slot end-icon - 右侧图标
 * @slot error-icon - 验证失败状态的右侧图标
 * @slot prefix - 左侧文本
 * @slot suffix - 右侧文本
 * @slot clear-button - 清空按钮
 * @slot clear-icon - 清空按钮中的图标
 * @slot helper - 底部的帮助文本
 *
 * @csspart text-field - 文本框，即 [`<mdui-text-field>`](/docs/2/components/text-field) 元素
 * @csspart menu - 下拉菜单，即 [`<mdui-menu>`](/docs/2/components/menu) 元素
 */
@customElement('mdui-select')
export class Select extends FocusableMixin(LitElement) implements FormControl {
  public static override styles: CSSResultGroup = [componentStyle, style];

  /**
   * 下拉框形状。可选值为：
   *
   * * `filled`：带背景色的下拉框，视觉效果较强
   * * `outlined`：带边框的下拉框，视觉效果较弱
   */
  @property({ reflect: true })
  public variant:
    | /*带背景色的下拉框，视觉效果较强*/ 'filled'
    | /*带边框的下拉框，视觉效果较弱*/ 'outlined' = 'filled';

  /**
   * 是否支持多选
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
  })
  public multiple = false;

  /**
   * 下拉框名称，将与表单数据一起提交
   */
  @property({ reflect: true })
  public name = '';

  /**
   * 下拉框的值，将与表单数据一起提交。
   *
   * 若未指定 `multiple` 属性，则该值为字符串；否则，该值为字符串数组。
   * HTML 属性只能设置字符串值；如果需要设置数组值，请通过 JavaScript 设置
   */
  @property()
  public value: string | string[] = '';

  /**
   * 默认选中的值。在重置表单时，将重置为该默认值。该属性只能通过 JavaScript 属性设置
   */
  @defaultValue()
  public defaultValue: string | string[] = '';

  /**
   * 标签文本
   */
  @property({ reflect: true })
  public label?: string;

  /**
   * 提示文本
   */
  @property({ reflect: true })
  public placeholder?: string;

  /**
   * 下拉框底部的帮助文本。也可以通过 `slot="helper"` 设置
   */
  @property({ reflect: true })
  public helper?: string;

  /**
   * 是否可清空下拉框
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
  })
  public clearable = false;

  /**
   * 可清空下拉框时，显示在下拉框右侧的清空按钮的 Material Icons 图标名。也可以通过 `slot="clear-icon"` 设置
   */
  @property({ reflect: true, attribute: 'clear-icon' })
  public clearIcon?: string;

  /**
   * 下拉框的方位。可选值为：
   *
   * * `auto`：自动判断方位
   * * `bottom`：位于下方
   * * `top`：位于上方
   */
  @property({ reflect: true })
  public placement:
    | /*自动判断方位*/ 'auto'
    | /*位于下方*/ 'bottom'
    | /*位于上方*/ 'top' = 'auto';

  /**
   * 文本是否右对齐
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
    attribute: 'end-aligned',
  })
  public endAligned = false;

  /**
   * 下拉框的前缀文本。仅在聚焦状态，或下拉框有值时才会显示。也可以通过 `slot="prefix"` 设置
   */
  @property({ reflect: true })
  public prefix!: string;

  /**
   * 下拉框的后缀文本。仅在聚焦状态，或下拉框有值时才会显示。也可以通过 `slot="suffix"` 设置
   */
  @property({ reflect: true })
  public suffix?: string;

  /**
   * 下拉框的前缀图标的 Material Icons 图标名。也可以通过 `slot="icon"` 设置
   */
  @property({ reflect: true })
  public icon?: string;

  /**
   * 下拉框的后缀图标的 Material Icons 图标名。也可以通过 `slot="end-icon"` 设置
   */
  @property({ reflect: true, attribute: 'end-icon' })
  public endIcon?: string;

  /**
   * 表单字段验证失败时，显示在下拉框右侧的 Material Icons 图标名。也可以通过 `slot="error-icon"` 设置
   */
  @property({ reflect: true, attribute: 'error-icon' })
  public errorIcon?: string;

  /**
   * 关联的 `form` 元素。此属性值必须为同一页面中的一个 `<form>` 元素的 `id` 属性。
   *
   * 如果此属性未指定，则元素必须是 `form` 元素的后代。利用此属性，你可以将元素放置在页面中的任何位置，而不仅仅是作为 `form` 元素的后代。
   */
  @property({ reflect: true })
  public form?: string;

  /**
   * 是否为只读
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
  })
  public readonly = false;

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
   * 提交表单时，是否必须填写该字段
   */
  @property({
    type: Boolean,
    reflect: true,
    converter: booleanConverter,
  })
  public required = false;

  /**
   * 是否验证未通过
   *
   * 该验证为浏览器原生验证 API，基于 `required` 属性的验证结果
   */
  @state()
  private invalid = false;

  @queryAssignedElements({ flatten: true, selector: 'mdui-menu-item' })
  private readonly menuItems!: MenuItem[];

  private observeResize?: ObserveResize;
  private readonly menuRef: Ref<Menu> = createRef();
  private readonly textFieldRef: Ref<TextField> = createRef();
  private readonly hiddenInputRef: Ref<HTMLInputElement> = createRef();
  private readonly formController = new FormController(this);
  private readonly hasSlotController = new HasSlotController(
    this,
    'icon',
    'end-icon',
    'error-icon',
    'prefix',
    'suffix',
    'clear-button',
    'clear-icon',
    'helper',
  );
  private readonly definedController = new DefinedController(this, {
    relatedElements: ['mdui-menu-item'],
  });

  /**
   * 表单验证状态对象
   */
  public get validity(): ValidityState {
    return this.hiddenInputRef.value!.validity;
  }

  /**
   * 表单验证的错误提示信息
   */
  public get validationMessage(): string {
    return this.hiddenInputRef.value!.validationMessage;
  }

  protected override get focusElement(): HTMLElement {
    return this.textFieldRef.value!;
  }

  protected override get focusDisabled(): boolean {
    return this.disabled;
  }

  public override connectedCallback(): void {
    super.connectedCallback();

    this.value =
      this.multiple && isString(this.value)
        ? this.value
          ? [this.value]
          : []
        : this.value;
    this.defaultValue = this.multiple ? [] : '';

    // 首次渲染时，slot 中的 mdui-menu-item 还未渲染完成，无法读取到其中的文本值
    // 所以需要在首次更新后，再次重新渲染，此时 mdui-menu-item 已渲染完成，可以读取到文本值
    this.definedController.whenDefined().then(() => {
      this.requestUpdate();
    });
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.observeResize?.unobserve();
  }

  /**
   * 检查表单字段是否验证通过。若未通过则返回 `false`，并触发 `invalid` 事件；若验证通过，则返回 `true`
   */
  public checkValidity(): boolean {
    const valid = this.hiddenInputRef.value!.checkValidity();

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
    this.invalid = !this.hiddenInputRef.value!.reportValidity();

    if (this.invalid) {
      emit(this, 'invalid', {
        bubbles: false,
        cancelable: true,
        composed: false,
      });

      this.focus();
    }

    return !this.invalid;
  }

  /**
   * 设置自定义的错误提示文本。只要文本不为空，则表示字段验证未通过
   *
   * @param message 自定义的提示文本
   */
  public setCustomValidity(message: string): void {
    this.hiddenInputRef.value!.setCustomValidity(message);
    this.invalid = !this.hiddenInputRef.value!.checkValidity();
  }

  protected override firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);

    this.observeResize = observeResize(this.textFieldRef.value!, () =>
      this.resizeMenu(),
    );
  }

  protected override render(): TemplateResult {
    const hasSelection = this.multiple ? !!this.value.length : !!this.value;

    return html`${this.multiple
        ? html`<select
            ${ref(this.hiddenInputRef)}
            class="hidden-input"
            name=${ifDefined(this.name)}
            value=${ifDefined(this.value)}
            .required=${this.required}
            .disabled=${this.disabled}
            multiple
            tabindex="-1"
          >
            ${map(
              this.value,
              (value) => html`<option selected value=${value}></option>`,
            )}
          </select>`
        : html`<input
            ${ref(this.hiddenInputRef)}
            type="radio"
            class="hidden-input"
            name=${ifDefined(this.name)}
            value=${ifDefined(this.value)}
            .required=${this.required}
            .disabled=${this.disabled}
            .checked=${hasSelection}
            tabindex="-1"
          />`}
      <mdui-dropdown
        .stayOpenOnClick=${this.multiple}
        .disabled=${this.readonly || this.disabled}
        .placement=${this.placement === 'top'
          ? 'top-start'
          : this.placement === 'bottom'
          ? 'bottom-start'
          : 'auto'}
        @open=${this.onDropdownOpen}
        @close=${this.onDropdownClose}
      >
        <mdui-text-field
          ${ref(this.textFieldRef)}
          slot="trigger"
          part="text-field"
          class="text-field"
          readonly
          .readonlyButClearable=${true}
          .variant=${this.variant}
          .name=${this.name}
          .value=${this.multiple
            ? this.value.length
              ? ' '
              : ''
            : this.getMenuItemLabelByValue(this.value as string)}
          .label=${this.label}
          .placeholder=${this.placeholder}
          .helper=${this.helper}
          .error=${this.hiddenInputRef.value?.validationMessage}
          .clearable=${this.clearable}
          .clearIcon=${this.clearIcon}
          .endAligned=${this.endAligned}
          .prefix=${this.prefix}
          .suffix=${this.suffix}
          .icon=${this.icon}
          .endIcon=${this.endIcon}
          .errorIcon=${this.errorIcon}
          .form=${this.form}
          .disabled=${this.disabled}
          .required=${this.required}
          .invalidStyle=${this.invalid}
          @clear=${this.onClear}
          @change=${(e: Event) => e.stopPropagation()}
          @keydown=${this.onTextFieldKeyDown}
        >
          ${map(
            [
              'icon',
              'end-icon',
              'error-icon',
              'prefix',
              'suffix',
              'clear-button',
              'clear-icon',
              'helper',
            ],
            (slotName) =>
              this.hasSlotController.test(slotName)
                ? html`<slot name=${slotName} slot=${slotName}></slot>`
                : nothing,
          )}
          ${when(
            this.multiple && this.value.length,
            () =>
              html`<div slot="input" class="chips">
                ${map(
                  this.value,
                  (valueItem) =>
                    html`<mdui-chip
                      class="chip"
                      variant="input"
                      deletable
                      tabindex="-1"
                      @delete=${() => this.onDeleteOneValue(valueItem)}
                    >
                      ${this.getMenuItemLabelByValue(valueItem)}
                    </mdui-chip>`,
                )}
              </div>`,
          )}
        </mdui-text-field>
        <mdui-menu
          ${ref(this.menuRef)}
          part="menu"
          .selects=${this.multiple ? 'multiple' : 'single'}
          .value=${this.value}
          @change=${this.onValueChange}
        >
          <slot></slot>
        </mdui-menu>
      </mdui-dropdown>`;
  }

  private getMenuItemLabelByValue(valueItem: string) {
    if (!this.menuItems.length) {
      return valueItem;
    }

    return (
      this.menuItems.find((item) => item.value === valueItem)?.textContent ||
      valueItem
    );
  }

  private resizeMenu() {
    this.menuRef.value!.style.width = `${
      this.textFieldRef.value!.clientWidth
    }px`;
  }

  private async onDropdownOpen() {
    // @ts-ignore
    this.textFieldRef.value!.focusedStyle = true;
  }

  private onDropdownClose() {
    // @ts-ignore
    this.textFieldRef.value!.focusedStyle = false;

    // 如果焦点在 <mdui-select> 组件内的元素上，则焦点回到 <mdui-select> 上
    if (
      this.contains(document.activeElement) ||
      this.contains(document.activeElement?.assignedSlot ?? null)
    ) {
      setTimeout(() => {
        this.focus();
      });
    }
  }

  private async onValueChange(e: Event) {
    const menu = e.target as Menu;
    this.value = this.multiple
      ? (menu.value as string[]).map((v) => v ?? '')
      : (menu.value as string | undefined) ?? '';

    await this.updateComplete;

    // reset 引起的值变更，不执行验证；直接修改值引起的变更，需要进行验证
    const form = this.formController.getForm();
    if (form && formResets.get(form)?.has(this)) {
      this.invalid = false;
      formResets.get(form)!.delete(this);
    } else {
      this.invalid = !this.hiddenInputRef.value!.checkValidity();
    }
  }

  /**
   * multiple 为 true 时，点 chip 的删除按钮，删除其中一个值
   */
  private onDeleteOneValue(valueItem: string) {
    const value = [...this.value];

    if (value.includes(valueItem)) {
      value.splice(value.indexOf(valueItem), 1);
    }

    this.value = value;
  }

  private onClear() {
    this.value = this.multiple ? [] : '';
  }

  /**
   * 焦点在 text-field 上时，按下回车键，打开下拉选项
   */
  private onTextFieldKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.textFieldRef.value!.click();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mdui-select': Select;
  }
}
