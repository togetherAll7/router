import { ReadableAtom } from 'nanostores'

type Params<Names extends string> = {
  [name in Names]: string
}

interface Pages {
  [name: string]: any
}

type Pattern<RouteParams> = [RegExp, (...parts: string[]) => RouteParams]

type Routes<AppPages extends Pages> = {
  [name in keyof AppPages]: string | Pattern<Params<AppPages[name]>>
}

export type RouteParams<
  AppPages extends Pages,
  PageName extends keyof AppPages
> = AppPages[PageName] extends void ? [] : [Params<AppPages[PageName]>]

export type Page<
  AppPages extends Pages = Pages,
  PageName extends keyof AppPages = any
> = PageName extends any
  ? {
      path: string
      route: PageName
      params: Params<AppPages[PageName]>
    }
  : never

export interface RouterOptions {
  search?: boolean
}

/**
 * Router store. Use {@link createRouter} to create it.
 *
 * It is a simple router without callbacks. Think about it as a URL parser.
 *
 * ```js
 * import { createRouter } from 'nanostores'
 *
 * // Types for TypeScript
 * interface Routes {
 *   home: void
 *   category: 'categoryId'
 *   post: 'categoryId' | 'id'
 * }
 *
 * export const router = createRouter<Routes>({
 *   home: '/',
 *   category: '/posts/:categoryId',
 *   post: '/posts/:categoryId/:id'
 * })
 * ```
 */
export interface Router<AppPages extends Pages = Pages>
  extends ReadableAtom<Page<AppPages, keyof AppPages> | undefined> {
  /**
   * Converted routes.
   */
  routes: [string, RegExp, (...params: string[]) => object, string?][]

  /**
   * Open URL without page reloading.
   *
   * ```js
   * router.open('/posts/guides/10')
   * ```
   *
   * @param path Absolute URL (`https://example.com/a`)
   *             or domain-less URL (`/a`).
   * @param redirect Don’t add entry to the navigation history.
   */
  open(path: string, redirect?: boolean): void
}

/**
 * Create {@link Router} store.
 *
 * ```js
 * import { createRouter } from 'nanostores'
 *
 * // Types for TypeScript
 * interface Routes {
 *   home: void
 *   category: 'categoryId'
 *   post: 'categoryId' | 'id'
 * }
 *
 * export const router = createRouter<Routes>({
 *   home: '/',
 *   category: '/posts/:categoryId',
 *   post: '/posts/:categoryId/:id'
 * })
 * ```
 *
 * @param routes URL patterns.
 */
export function createRouter<AppPages extends Pages>(
  routes: Routes<AppPages>,
  opts?: RouterOptions
): Router<AppPages>

/**
 * Open page by name and parameters. Pushes new state into history.
 *
 * ```js
 * import { openPage } from 'nanostores'
 *
 * openPage(router, 'post', { categoryId: 'guides', id: '10' })
 * ```
 *
 * @param name Route name.
 * @param params Route parameters.
 */
export function openPage<
  AppPages extends Pages,
  PageName extends keyof AppPages
>(
  router: Router<AppPages>,
  name: PageName,
  ...params: AppPages[PageName] extends void ? [] : [Params<AppPages[PageName]>]
): void

/**
 * Open page by name and parameters. Replaces recent state in history.
 *
 * ```js
 * import { redirectPage } from '@logux/state'
 *
 * openPage(router, 'login')
 * // replace login route, so we don't face it on back navigation
 * redirectPage(router, 'post', { categoryId: 'guides', id: '10' })
 * ```
 *
 * @param name Route name.
 * @param params Route parameters.
 */
export function redirectPage<
  AppPages extends Pages,
  PageName extends keyof AppPages
>(
  router: Router<AppPages>,
  name: PageName,
  ...params: AppPages[PageName] extends void ? [] : [Params<AppPages[PageName]>]
): void

/**
 * Generates pathname by name and parameters. Useful to render links.
 *
 * ```js
 * import { getPageUrl } from 'nanostores'
 *
 * getPageUrl(router, 'post', { categoryId: 'guides', id: '10' })
 * //=> '/posts/guides/10'
 * ```
 *
 * @param name Route name.
 * @param params Route parameters.
 */
export function getPagePath<
  AppPages extends Pages,
  PageName extends keyof AppPages
>(
  router: Router<AppPages>,
  name: PageName,
  ...params: RouteParams<AppPages, PageName>
): string
