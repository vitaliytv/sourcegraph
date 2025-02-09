import MapSearchIcon from 'mdi-react/MapSearchIcon'
import React from 'react'
import { Route, RouteComponentProps, Switch } from 'react-router'

import { LoadingSpinner } from '@sourcegraph/react-loading-spinner'
import { TelemetryProps } from '@sourcegraph/shared/src/telemetry/telemetryService'
import { ThemeProps } from '@sourcegraph/shared/src/theme'

import { AuthenticatedUser } from '../../auth'
import { withAuthenticatedUser } from '../../auth/withAuthenticatedUser'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import { HeroPage } from '../../components/HeroPage'
import { CreateAccessTokenResult, UserAreaUserFields } from '../../graphql-operations'
import { OnboardingTourProps } from '../../search'
import { UserRepositoriesUpdateProps } from '../../util'
import { RouteDescriptor } from '../../util/contributions'
import { UserAreaRouteContext } from '../area/UserArea'

import { UserSettingsSidebar, UserSettingsSidebarItems } from './UserSettingsSidebar'

const NotFoundPage: React.FunctionComponent = () => <HeroPage icon={MapSearchIcon} title="404: Not Found" />

export interface UserSettingsAreaRoute extends RouteDescriptor<UserSettingsAreaRouteContext> {}

export interface UserSettingsAreaProps
    extends UserAreaRouteContext,
        RouteComponentProps<{}>,
        ThemeProps,
        TelemetryProps,
        OnboardingTourProps,
        UserRepositoriesUpdateProps {
    authenticatedUser: AuthenticatedUser
    sideBarItems: UserSettingsSidebarItems
    routes: readonly UserSettingsAreaRoute[]
}

export interface UserSettingsAreaRouteContext extends UserSettingsAreaProps {
    /**
     * The user who is the subject of the page. This can differ from the authenticatedUser (e.g., when a site admin
     * is viewing another user's account page).
     */
    user: UserAreaUserFields
}

interface UserSettingsAreaState {
    /**
     * Holds the newly created access token (from UserSettingsCreateAccessTokenPage), if any. After
     * it is displayed to the user, this subject's value is set back to undefined.
     */
    newlyCreatedAccessToken?: CreateAccessTokenResult['createAccessToken']
}

/**
 * Renders a layout of a sidebar and a content area to display user settings.
 */
export const UserSettingsArea = withAuthenticatedUser(
    class UserSettingsArea extends React.Component<UserSettingsAreaProps, UserSettingsAreaState> {
        public state: UserSettingsAreaState = {}

        public render(): JSX.Element | null {
            if (!this.props.user) {
                return null
            }

            if (this.props.authenticatedUser.id !== this.props.user.id && !this.props.user.viewerCanAdminister) {
                return (
                    <HeroPage
                        icon={MapSearchIcon}
                        title="403: Forbidden"
                        subtitle="You are not authorized to view or edit this user's settings."
                    />
                )
            }

            const { children, ...props } = this.props
            const context: UserSettingsAreaRouteContext = {
                ...props,
            }

            return (
                <div className="d-flex">
                    <UserSettingsSidebar
                        items={this.props.sideBarItems}
                        {...this.props}
                        className="flex-0 mr-3 user-settings-sidebar"
                    />
                    <div className="flex-1">
                        <ErrorBoundary location={this.props.location}>
                            <React.Suspense fallback={<LoadingSpinner className="icon-inline m-2" />}>
                                <Switch>
                                    {this.props.routes.map(
                                        ({ path, exact, render, condition = () => true }) =>
                                            condition(context) && (
                                                <Route
                                                    // eslint-disable-next-line react/jsx-no-bind
                                                    render={routeComponentProps =>
                                                        render({ ...context, ...routeComponentProps })
                                                    }
                                                    path={this.props.match.url + path}
                                                    key="hardcoded-key" // see https://github.com/ReactTraining/react-router/issues/4578#issuecomment-334489490
                                                    exact={exact}
                                                />
                                            )
                                    )}
                                    <Route component={NotFoundPage} key="hardcoded-key" />
                                </Switch>
                            </React.Suspense>
                        </ErrorBoundary>
                    </div>
                </div>
            )
        }
    }
)
