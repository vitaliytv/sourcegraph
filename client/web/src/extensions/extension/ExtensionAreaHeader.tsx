import classNames from 'classnames'
import PuzzleOutlineIcon from 'mdi-react/PuzzleOutlineIcon'
import React, { useState, useCallback } from 'react'
import { Link, NavLink, RouteComponentProps } from 'react-router-dom'

import { isExtensionEnabled, splitExtensionID } from '@sourcegraph/shared/src/extensions/extension'
import { ExtensionManifest } from '@sourcegraph/shared/src/schema/extensionSchema'
import { isErrorLike } from '@sourcegraph/shared/src/util/errors'
import { useTimeoutManager } from '@sourcegraph/shared/src/util/useTimeoutManager'

import { PageHeader } from '../../components/PageHeader'
import { NavItemWithIconDescriptor } from '../../util/contributions'
import { ExtensionToggle } from '../ExtensionToggle'

import { ExtensionAreaRouteContext } from './ExtensionArea'
import { ExtensionStatusBadge } from './ExtensionStatusBadge'

interface ExtensionAreaHeaderProps extends ExtensionAreaRouteContext, RouteComponentProps<{}> {
    navItems: readonly ExtensionAreaHeaderNavItem[]
    className: string
}

export type ExtensionAreaHeaderContext = Pick<ExtensionAreaHeaderProps, 'extension'>

export interface ExtensionAreaHeaderNavItem extends NavItemWithIconDescriptor<ExtensionAreaHeaderContext> {}

/** ms after which to remove visual feedback */
const FEEDBACK_DELAY = 5000

/**
 * Header for the extension area.
 */
export const ExtensionAreaHeader: React.FunctionComponent<ExtensionAreaHeaderProps> = (
    props: ExtensionAreaHeaderProps
) => {
    const manifest: ExtensionManifest | undefined =
        props.extension.manifest && !isErrorLike(props.extension.manifest) ? props.extension.manifest : undefined

    const isWorkInProgress = props.extension.registryExtension?.isWorkInProgress

    const { publisher, name } = splitExtensionID(props.extension.id)

    /**
     * When extension enablement state changes, display visual feedback for $delay seconds.
     * Clear the timeout when the component unmounts or the extension is toggled again.
     */
    const [change, setChange] = useState<'enabled' | 'disabled' | null>(null)
    const feedbackTimeoutManager = useTimeoutManager()

    const onToggleChange = React.useCallback(
        (enabled: boolean): void => {
            setChange(enabled ? 'enabled' : 'disabled')
            feedbackTimeoutManager.setTimeout(() => setChange(null), FEEDBACK_DELAY)
        },
        [feedbackTimeoutManager]
    )

    /**
     * Display a CTA on hover over the toggle only when the user is unauthenticated
     */
    const [showCta, setShowCta] = useState(false)
    const ctaTimeoutManager = useTimeoutManager()

    const onHover = useCallback(() => {
        if (!props.authenticatedUser && !showCta) {
            setShowCta(true)
            ctaTimeoutManager.setTimeout(() => setShowCta(false), FEEDBACK_DELAY * 2)
        }
    }, [ctaTimeoutManager, showCta, props.authenticatedUser])

    return (
        <div className={`extension-area-header ${props.className || ''}`}>
            <div className="container">
                {props.extension && (
                    <>
                        <PageHeader
                            annotation={
                                isWorkInProgress && (
                                    <ExtensionStatusBadge
                                        viewerCanAdminister={
                                            props.extension.registryExtension?.viewerCanAdminister || false
                                        }
                                    />
                                )
                            }
                            path={[{ to: '/extensions', icon: PuzzleOutlineIcon }, { text: publisher }, { text: name }]}
                            byline={
                                manifest &&
                                (manifest.description || isWorkInProgress) && (
                                    <p className="mt-1 mb-0">{manifest.description}</p>
                                )
                            }
                            actions={
                                <div className="position-relative extension-area-header__actions">
                                    {change && (
                                        <div
                                            className={classNames('alert px-2 py-1 mb-0 extension-area-header__alert', {
                                                'alert-secondary': change === 'disabled',
                                                'alert-success': change === 'enabled',
                                            })}
                                        >
                                            <span className="font-weight-semibold">{name}</span> is {change}
                                        </div>
                                    )}
                                    {showCta && (
                                        <div className="alert alert-info mb-0 px-2 py-1 extension-area-header__alert">
                                            An account is required to create and configure extensions.{' '}
                                            <Link to="/sign-up" className="alert-link">
                                                Register now!
                                            </Link>
                                        </div>
                                    )}
                                    <ExtensionToggle
                                        className="mt-md-3"
                                        enabled={isExtensionEnabled(props.settingsCascade.final, props.extension.id)}
                                        extensionID={props.extension.id}
                                        settingsCascade={props.settingsCascade}
                                        platformContext={props.platformContext}
                                        onToggleChange={onToggleChange}
                                        big={true}
                                        onHover={onHover}
                                        userCannotToggle={!props.authenticatedUser}
                                    />
                                </div>
                            }
                        />
                        <div className="mt-4">
                            <ul className="nav nav-tabs border-bottom-0">
                                {props.navItems.map(
                                    ({ to, label, exact, icon: Icon, condition = () => true }) =>
                                        condition(props) && (
                                            <li key={label} className="nav-item">
                                                <NavLink
                                                    to={props.url + to}
                                                    className="nav-link"
                                                    activeClassName="active"
                                                    exact={exact}
                                                >
                                                    {Icon && <Icon className="icon-inline" />} {label}
                                                </NavLink>
                                            </li>
                                        )
                                )}
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
