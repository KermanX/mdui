import { getDocument } from 'ssr-window';

/**
 * DOM 是否已加载完成
 *
 * 在 Web Components 中操作组件外部的 DOM、或组件中的 slot 的 DOM 时，必须先判断 DOM 是否已加载完成。
 */
export const isDomReady = (document = getDocument()): boolean => {
  return /complete|interactive/.test(document.readyState);
};

export const createElement = (tagName: string): HTMLElement => {
  const document = getDocument();
  return document.createElement(tagName);
};

export const appendChild = <T extends Node>(element: Node, child: T): T => {
  return element.appendChild(child);
};

export const removeChild = <T extends Node>(element: T): T => {
  return element.parentNode ? element.parentNode.removeChild(element) : element;
};

/**
 * 获取子节点组成的数组
 * @param target
 * @param parent
 */
export const getChildNodesArray = (
  target: string,
  parent: string,
): Array<Node> => {
  const tempParent = createElement(parent);
  tempParent.innerHTML = target;

  return [].slice.call(tempParent.childNodes);
};
