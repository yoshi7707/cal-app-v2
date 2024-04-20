import React, { Fragment, useMemo } from 'react'
import PropTypes from 'prop-types'
import moment from 'moment'
moment.locale('en')  // Set the locale to English
import {
  Calendar,
  Views,
  DateLocalizer,
  momentLocalizer,
} from 'react-big-calendar'
// import DemoLink from '../react-big-calendar/stories/DemoLink.component'
import events from '../react-big-calendar/stories/resources/events'
import * as dates from '../react-big-calendar/src/utils/dates'
import 'react-big-calendar/lib/css/react-big-calendar.css';


const mLocalizer = momentLocalizer(moment)

// const ColoredDateCellWrapper = ({ children }) =>
//   React.cloneElement(React.Children.only(children), {
//     style: {
//       backgroundColor: 'lightblue',
//     },
//   })

/**
 * We are defaulting the localizer here because we are using this same
 * example on the main 'About' page in Storybook
 */
export default function Basic({
  localizer = mLocalizer,
//   showDemoLink = true,
  ...props
}) {
  const { components, defaultDate, max, views } = useMemo(
    () => ({
    //   components: {
    //     timeSlotWrapper: ColoredDateCellWrapper,
    //   },
      defaultDate: new Date(2015, 3, 1),
      max: dates.add(dates.endOf(new Date(2015, 17, 1), 'day'), -1, 'hours'),
      views: Object.keys(Views).map((k) => Views[k]),
    }),
    []
  )

  return (
    <Fragment>
      {/* {showDemoLink ? <DemoLink fileName="basic" /> : null} */}
      <div className="height600" {...props}>
        <Calendar
        style={{ height: 1000 }}
        //   components={components}
          events={events}
          localizer={localizer}
          defaultDate={defaultDate}
        //   showMultiDayTimes
        //   max={max}         
        //   step={40}
        //   views={views}
        />
      </div>
    </Fragment>
  )
}
// Basic.propTypes = {
//   localizer: PropTypes.instanceOf(DateLocalizer),
//   showDemoLink: PropTypes.bool,
// }