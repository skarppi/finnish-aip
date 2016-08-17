/* eslint-env mocha */
const chai = require('chai')
const parser = require('../lib/parser')

chai.should()

describe('Parsing AIP coordinates', () => {
  it('should convert dms coordinate to decimal format', () =>
    parser.coordinate('601514N 0250239E').should.deep.equal(
      [25.04416666666667, 60.25388888888889]
    )
  )

  it('should convert dms coordinate with partial seconds to decimal format', () =>
    parser.coordinate('601506.71N 0250218.11E').should.deep.equal(
      [25.03836388888889, 60.25186388888889]
    )
  )

  it('should convert coordinates separated by dash', () =>
    parser.coordinates(['642619N 0285347E - 642614N 0290008E']).should.deep.equal(
      [[28.89638888888889, 64.43861111111111], [29.002222222222223, 64.43722222222223]]
    )
  )

  it('should convert coordinates separated by dash and split into multiple rows', () =>
    parser.coordinates([
      '642619N 0285347E - ', // common way to have space
      '673134N 0251740E -', // special case for EFKT
      '601514N 0250239E',
    ]).should.deep.equal(
      [
        [28.89638888888889, 64.43861111111111],
        [25.294444444444448, 67.5261111111111],
        [25.04416666666667, 60.25388888888889],
      ]
    )
  )

  it('should convert coordinates separated by both dashes and line breaks', () =>
    parser.coordinates(
      ['642619N 0285347E - 673134N 0251740E - ', '601514N 0250239E']
    ).should.deep.equal(
      [
        [28.89638888888889, 64.43861111111111],
        [25.294444444444448, 67.5261111111111],
        [25.04416666666667, 60.25388888888889],
      ]
    )
  )
})
