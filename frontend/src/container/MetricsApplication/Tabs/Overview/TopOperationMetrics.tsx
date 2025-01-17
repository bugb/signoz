import { PANEL_TYPES } from 'constants/queryBuilder';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { topOperationQueries } from 'container/MetricsApplication/MetricsPageQueries/TopOperationQueries';
import { QueryTable } from 'container/QueryTable';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useStepInterval } from 'hooks/queryBuilder/useStepInterval';
import { useNotifications } from 'hooks/useNotifications';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { isEmpty } from 'lodash-es';
import { ReactNode, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { EQueryType } from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';
import { v4 as uuid } from 'uuid';

import { IServiceName } from '../types';
import ColumnWithLink from './TableRenderer/ColumnWithLink';
import { getTableColumnRenderer } from './TableRenderer/TableColumnRenderer';

function TopOperationMetrics(): JSX.Element {
	const { servicename } = useParams<IServiceName>();

	const { notifications } = useNotifications();

	const { minTime, maxTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { queries } = useResourceAttribute();

	const selectedTraceTags = JSON.stringify(
		convertRawQueriesToTraceSelectedTags(queries) || [],
	);

	const keyOperationWidget = useMemo(
		() =>
			getWidgetQueryBuilder({
				query: {
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: topOperationQueries({
						servicename,
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				panelTypes: PANEL_TYPES.TABLE,
			}),
		[servicename],
	);

	const updatedQuery = useStepInterval(keyOperationWidget.query);

	const isEmptyWidget = useMemo(
		() => keyOperationWidget.id === 'empty' || isEmpty(keyOperationWidget),
		[keyOperationWidget],
	);

	const { data, isLoading } = useGetQueryRange(
		{
			selectedTime: keyOperationWidget?.timePreferance,
			graphType: keyOperationWidget?.panelTypes,
			query: updatedQuery,
			globalSelectedInterval,
			variables: getDashboardVariables(),
		},
		{
			queryKey: [
				`GetMetricsQueryRange-${keyOperationWidget?.timePreferance}-${globalSelectedInterval}-${keyOperationWidget?.id}`,
				keyOperationWidget,
				maxTime,
				minTime,
				globalSelectedInterval,
			],
			keepPreviousData: true,
			enabled: !isEmptyWidget,
			refetchOnMount: false,
			onError: (error) => {
				notifications.error({ message: error.message });
			},
		},
	);

	const queryTableData = data?.payload.data.newResult.data.result || [];

	const renderColumnCell = useMemo(
		() =>
			getTableColumnRenderer({
				columnName: 'operation',
				renderFunction: (record: RowData): ReactNode => (
					<ColumnWithLink
						servicename={servicename}
						minTime={minTime}
						maxTime={maxTime}
						selectedTraceTags={selectedTraceTags}
						record={record}
					/>
				),
			}),
		[servicename, minTime, maxTime, selectedTraceTags],
	);

	return (
		<QueryTable
			query={updatedQuery}
			queryTableData={queryTableData}
			loading={isLoading}
			renderColumnCell={renderColumnCell}
		/>
	);
}

export default TopOperationMetrics;
