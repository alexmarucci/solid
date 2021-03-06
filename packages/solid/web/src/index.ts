import { insert, spread } from "./runtime";
import {
  createSignal,
  createMemo,
  onCleanup,
  untrack,
  splitProps,
  Component,
  JSX,
  createRoot
} from "solid-js";

export * from "./runtime";

export {
  For,
  Show,
  Suspense,
  SuspenseList,
  Switch,
  Match,
  Index,
  ErrorBoundary,
  assignProps
} from "solid-js";

export * from "./server-mock";
export const isServer = false;
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

function createElement(tagName: string, isSVG = false): HTMLElement|SVGElement {
  return isSVG ? document.createElement(tagName) :
                 document.createElementNS(SVG_NAMESPACE, tagName);
}

export function Portal(props: {
  mount?: Node;
  useShadow?: boolean;
  isSVG?: boolean;
  children: JSX.Element;
}) {
  const hydration = globalThis._$HYDRATION;
  const { useShadow } = props,
    marker = document.createTextNode(""),
    mount = props.mount || document.body;

  // don't render when hydrating
  function renderPortal() {
    if (hydration && hydration.context) {
      const [s, set] = createSignal(false);
      queueMicrotask(() => set(true));
      return () => s() && props.children;
    } else return () => props.children;
  }

  if (mount instanceof HTMLHeadElement) {
    const [clean, setClean] = createSignal(false);
    const cleanup = () => setClean(true);
    createRoot(dispose => insert(mount, () => (!clean() ? renderPortal()() : dispose()), null));
    onCleanup(() => {
      if (hydration && hydration.context) queueMicrotask(cleanup);
      else cleanup();
    });
  } else {
    const container = createElement(props.isSVG ? "g" : "div", props.isSVG),
      renderRoot =
        useShadow && container.attachShadow ? container.attachShadow({ mode: "open" }) : container;

    Object.defineProperty(container, "host", {
      get() {
        return marker.parentNode;
      }
    });
    insert(renderRoot, renderPortal());
    mount.appendChild(container);
    (props as any).ref && (props as any).ref(container);
    onCleanup(() => mount.removeChild(container));
  }
  return marker;
}

type DynamicProps<T> = T&{
  children?: any;
  component?: Component<T>|string|keyof JSX.IntrinsicElements;
  isSVG?: boolean;
};

export function Dynamic<T>(props: DynamicProps<T>): () => JSX.Element {
  const [p, others] = splitProps(props, ["component", "isSVG"]);
  return createMemo(() => {
    switch (p.component && typeof p.component) {
      case "function":
        return untrack(() => (p.component as Function)(others));

      case "string":
        const el = createElement(p.component as string, p.isSVG);
        spread(el, others, p.isSVG);
        return el;

      default:
        break;
    }
  });
}
